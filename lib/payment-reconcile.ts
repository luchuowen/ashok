import {
  claimOrderRestock,
  claimOrderTransaction,
  getOrderByTransactionId,
  getOrCreateCustomer,
  getPaymentByTransactionId,
  updateOrderByTransactionId,
  updatePaymentByTransactionId,
  type Order,
  type OrderStage,
} from "@/lib/db";
import { customOrderConfirmationEmail, orderConfirmationEmail } from "@/lib/email-templates";
import { bookingNotifyAddress } from "@/lib/resend";
import { recordPromoUse } from "@/lib/promo";
import { restockForOrder } from "@/lib/inventory";
import { sendEmail } from "@/lib/resend";
import type { TaifaPayTransaction } from "@/lib/taifapay";

/**
 * Single place that turns a *final* TaifaPay transaction status into our own
 * order/payment state. Two callers feed it the same canonical status:
 *
 *  - app/api/webhooks/taifapay/route.ts — TaifaPay's server-to-server push.
 *  - app/api/checkout/status/route.ts   — the customer's browser polling
 *    /checkout/complete, which asks TaifaPay directly for the transaction.
 *
 * Before this existed only the webhook wrote to Firestore, so a checkout
 * whose webhook never arrived (webhook not registered in the merchant
 * dashboard, wrong secret, a dropped delivery) showed the customer
 * "Payment received" while the order sat in "Payment Pending" forever with
 * its stock still reserved. Now whichever signal lands first reconciles;
 * the second is a no-op.
 *
 * Idempotent by design: every branch first checks the order's current
 * stage, so duplicate webhook deliveries and a poll racing a webhook can't
 * double-restock, double-email, or cancel an order that has already been
 * paid.
 */
export type ReconcileResult =
  | { action: "paid"; order: Order }
  | { action: "cancelled"; order: Order }
  | { action: "noop"; reason: string };

export async function reconcileTransaction(
  transactionId: string,
  status: TaifaPayTransaction["status"],
  /** Amount the gateway reports for this transaction, when the caller has it. */
  gatewayAmount?: number,
): Promise<ReconcileResult> {
  if (status === "PENDING") return { action: "noop", reason: "still pending" };

  const order = await getOrderByTransactionId(transactionId);

  if (status === "COMPLETED") {
    // Idempotency key is the payment record for THIS transaction: once it's
    // Paid, any repeat signal (webhook retry, poll racing the webhook) is a
    // no-op. Orders predating payment records fall back to the old stage check.
    const payment = await getPaymentByTransactionId(transactionId);
    if (payment?.status === "Paid") return { action: "noop", reason: "already paid" };
    if (!payment && order?.stage === "Paid") return { action: "noop", reason: "already paid" };
    if (!order) {
      await updatePaymentByTransactionId(transactionId, { status: "Paid" });
      return { action: "noop", reason: "no order for this transaction" };
    }
    // Race-safe idempotency on the order itself (covers orders whose
    // best-effort payment record was never written).
    if (!(await claimOrderTransaction(order.id, transactionId))) {
      return { action: "noop", reason: "transaction already applied" };
    }
    await updatePaymentByTransactionId(transactionId, { status: "Paid" });

    // Amount-aware: a deposit or part-payment reduces the balance by what
    // was actually paid on this transaction — it no longer zeroes the
    // balance and flips the order to "Paid" whatever the amount. Prefer the
    // gateway's own figure, then our payment record, then what the checkout
    // invoiced; only a legacy order with none of those falls back to the
    // full balance.
    const firstInvoice = order.stage === "Payment Pending" || order.stage === "Cancelled" ? order.amountDueNow : undefined;
    const paidAmount = [gatewayAmount, payment?.amount, firstInvoice, order.balanceDue].find(
      (n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0,
    ) ?? order.balanceDue;
    const balanceDue = Math.max(0, order.balanceDue - paidAmount);
    const wasCancelled = order.stage === "Cancelled";
    const balanceText = `KES ${balanceDue.toLocaleString("en-KE")}`;
    let stage: OrderStage = order.stage;
    let statusNote: string;

    if (order.source === "custom") {
      const atelier = order.fitProfile?.method === "atelier";
      const next = atelier ? "book your measuring appointment at the atelier" : "we're drafting your pattern";
      if (order.stage === "Payment Pending" || wasCancelled) {
        stage = atelier ? "Consultation" : "Measurements Taken";
        statusNote = balanceDue > 0 ? `Deposit received — ${next}. Balance ${balanceText} due at fitting` : `Paid in full — ${next}`;
      } else {
        statusNote = balanceDue > 0 ? `Payment received — balance ${balanceText}` : `Paid in full — ${order.stage.toLowerCase()}`;
      }
      if (wasCancelled) statusNote = `Payment received AFTER this order was cancelled — confirm with the customer. ${statusNote}`;
    } else if (order.source === "shop") {
      stage = "Paid";
      statusNote = wasCancelled
        ? "Payment received AFTER this order was cancelled — stock was returned; confirm availability before fulfilling"
        : "Payment received — preparing for collection";
    } else {
      // Staff-created bespoke order paying a link mid-production: record the
      // money, keep the tailoring stage as it is.
      if (order.stage === "Payment Pending") stage = balanceDue > 0 ? order.stage : "Paid";
      statusNote = balanceDue > 0 ? `Payment received — balance ${balanceText}` : "Paid in full";
    }

    await updateOrderByTransactionId(transactionId, { stage, statusNote, balanceDue });
    if (wasCancelled) {
      console.error(`[payment-reconcile] transaction ${transactionId} completed after order ${order.id} was cancelled — needs a manual check.`);
    }
    const paid: Order = { ...order, stage, statusNote, balanceDue };
    const firstPayment = order.stage === "Payment Pending" || wasCancelled;
    if (firstPayment && order.promo?.code) {
      await recordPromoUse(order.promo.code, order.promo.discount).catch((e) => console.error("[payment-reconcile] promo use not recorded:", e instanceof Error ? e.message : e));
    }
    if (firstPayment && order.source === "shop" && order.items && order.items.length > 0) {
      await notifyCustomerOrderConfirmed(paid).catch((emailError) => {
        console.error(
          "[payment-reconcile] order-confirmation email failed:",
          emailError instanceof Error ? `${emailError.name}: ${emailError.message}` : emailError,
        );
      });
    }
    if (firstPayment && order.source === "custom") {
      await notifyCustomOrder(paid, paidAmount, wasCancelled).catch((emailError) => {
        console.error(
          "[payment-reconcile] custom-order email failed:",
          emailError instanceof Error ? `${emailError.name}: ${emailError.message}` : emailError,
        );
      });
    }
    return { action: "paid", order: paid };
  }

  // FAILED
  const existingPayment = await getPaymentByTransactionId(transactionId);
  if (existingPayment?.status === "Paid") return { action: "noop", reason: "already paid" };
  await updatePaymentByTransactionId(transactionId, { status: "Failed" });
  // Only auto-cancel an order still sitting in its initial "awaiting first
  // payment" state (every shop checkout starts there — see
  // app/api/checkout/create-invoice/route.ts). A bespoke order can reach
  // "Payment Pending" again later for a balance/deposit link generated well
  // after work has already started (app/api/admin/orders/[id]/invoice/
  // route.ts) — a customer's expired or declined M-Pesa prompt on THAT link
  // must never silently cancel a tailoring order that's already
  // mid-production; staff just generates another payment link.
  if (!order) return { action: "noop", reason: "no order for this transaction" };
  if (order.stage !== "Payment Pending") {
    return { action: "noop", reason: `order is ${order.stage}, not cancelling` };
  }
  await updateOrderByTransactionId(transactionId, {
    stage: "Cancelled",
    statusNote: "Payment did not go through — order cancelled",
  });
  // The shop checkout route deducts stock the moment it creates the
  // invoice, before the customer has actually paid — reserving it against
  // being sold twice while their M-Pesa prompt is outstanding. If they
  // never complete it, that reservation has to come back. Bespoke orders
  // have no `items` (nothing stock-tracked), so this is a no-op for them.
  if (order.items && order.items.length > 0 && (await claimOrderRestock(order.id))) {
    await restockForOrder(
      order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
      })),
      order.id,
      "cancellation-restock",
    ).catch((restockError) => {
      console.error(
        `[payment-reconcile] Failed to restock cancelled order ${order.id} — manual correction needed:`,
        restockError instanceof Error ? restockError.message : restockError,
      );
    });
  }
  return { action: "cancelled", order: { ...order, stage: "Cancelled" } };
}

/** Confirmation with the full suit specification to the customer (if we
 *  have an email) and a work notification to the atelier. */
async function notifyCustomOrder(order: Order, paidAmount: number, staffOnly = false): Promise<void> {
  const customer = await getOrCreateCustomer(order.clientId);
  const reference = order.id.slice(-8).toUpperCase();
  const html = customOrderConfirmationEmail({
    name: customer.name || "there",
    orderReference: reference,
    order,
    paidAmount,
  });
  const sends: Promise<void>[] = [
    sendEmail({
      to: bookingNotifyAddress(),
      subject: `New custom suit order ${reference} — ${order.clientName} (${order.fitProfile?.method === "atelier" ? "needs measuring" : "measurements supplied"})`,
      html,
    }),
  ];
  // A payment landing after cancellation needs a human first — staff only.
  const to = staffOnly ? "" : order.customerEmail || customer.email;
  if (to) sends.push(sendEmail({ to, subject: `Your suit order ${reference} is confirmed`, html }));
  await Promise.allSettled(sends);
}

/** A receipt for the customer — skipped silently if this customer has no
 *  email on file, since checkout only ever requires a phone number. */
async function notifyCustomerOrderConfirmed(order: Order): Promise<void> {
  if (!order.items || order.items.length === 0) return;
  const customer = await getOrCreateCustomer(order.clientId);
  if (!customer.email) return;
  await sendEmail({
    to: customer.email,
    subject: `Order confirmed — ${order.id.slice(-8).toUpperCase()}`,
    html: orderConfirmationEmail({
      name: customer.name || "there",
      orderReference: order.id.slice(-8).toUpperCase(),
      items: order.items.map((item) => ({
        name: item.productName,
        variantLabel: item.variantLabel,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
      total: `KES ${order.price.toLocaleString("en-KE")}`,
    }),
  });
}
