import { getOrderByTransactionId, getOrCreateCustomer, updateOrderByTransactionId, updatePaymentByTransactionId, type Order } from "@/lib/db";
import { orderConfirmationEmail } from "@/lib/email-templates";
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
): Promise<ReconcileResult> {
  if (status === "PENDING") return { action: "noop", reason: "still pending" };

  const order = await getOrderByTransactionId(transactionId);

  if (status === "COMPLETED") {
    if (order?.stage === "Paid") return { action: "noop", reason: "already paid" };
    await updatePaymentByTransactionId(transactionId, { status: "Paid" });
    // A late M-Pesa confirmation can land after a "failed/expired" signal
    // already cancelled the order and put its stock back. Money has moved,
    // so the order is Paid regardless — but the stock was restocked, so
    // staff must re-check it rather than us silently deducting twice.
    const wasCancelled = order?.stage === "Cancelled";
    await updateOrderByTransactionId(transactionId, {
      stage: "Paid",
      statusNote: wasCancelled
        ? "Payment received AFTER this order was cancelled — stock was returned; confirm availability before fulfilling"
        : "Payment received — preparing for collection",
      balanceDue: 0,
    });
    if (wasCancelled) {
      console.error(
        `[payment-reconcile] transaction ${transactionId} completed after order ${order?.id} was cancelled — stock needs manual check.`,
      );
    }
    if (!order) return { action: "noop", reason: "no order for this transaction" };
    const paid: Order = { ...order, stage: "Paid", balanceDue: 0 };
    if (order.source === "shop" && order.items && order.items.length > 0) {
      await notifyCustomerOrderConfirmed(paid).catch((emailError) => {
        console.error(
          "[payment-reconcile] order-confirmation email failed:",
          emailError instanceof Error ? `${emailError.name}: ${emailError.message}` : emailError,
        );
      });
    }
    return { action: "paid", order: paid };
  }

  // FAILED
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
  if (order.items && order.items.length > 0) {
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
