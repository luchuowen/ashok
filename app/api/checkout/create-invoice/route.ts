import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeKenyanMobile } from "@/lib/sms";
import { createInvoice, TaifaPayError } from "@/lib/taifapay";
import { deductStockForOrder, effectivePrice, getProduct, restockForOrder, InsufficientStockError } from "@/lib/inventory";
import { createOrder, createPayment, getOrCreateCustomer, updateOrder, type OrderItem } from "@/lib/db";
import { bookingNotifyAddress, sendEmail } from "@/lib/resend";
import { lowStockAlertEmail } from "@/lib/email-templates";
import { nairobiToday } from "@/lib/dates";

interface CartItemInput {
  productId?: string;
  variantId?: string;
  qty?: number;
}

const MAX_QTY_PER_ITEM = 20;

function getSiteUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  // Fall back to the request's own origin (works for preview deploys too).
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  let body: {
    items?: CartItemInput[];
    customerName?: string;
    customerPhone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Merge duplicate product/variant lines first — otherwise two lines of
  // the same size each pass the per-line MAX_QTY_PER_ITEM cap separately.
  const rawItems: CartItemInput[] = [];
  for (const raw of Array.isArray(body.items) ? body.items : []) {
    if (!raw || typeof raw !== "object") continue;
    const existing = rawItems.find(
      (r) => r.productId === raw.productId && r.variantId === raw.variantId,
    );
    if (existing) existing.qty = Number(existing.qty) + Number(raw.qty);
    else rawItems.push({ ...raw });
  }
  if (rawItems.length === 0) {
    return NextResponse.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
  }

  const mobile = normalizeKenyanMobile(body.customerPhone ?? "");
  if (!mobile) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid Kenyan phone number." },
      { status: 400 },
    );
  }

  // Recompute price and confirm each line against the live Firestore
  // catalogue (never the client's cart state — see app/cart-context.tsx,
  // still plain localStorage) for both the amount charged and whether the
  // product/variant still exists and is still published. Stock itself is
  // NOT checked here — deductStockForOrder below does that check and the
  // deduction as one atomic transaction per line, which is the only way to
  // avoid a race between two customers both being told "in stock" a moment
  // before one of them actually reserves the last unit.
  let amount = 0;
  const lines: string[] = [];
  const stockLines: { productId: string; variantId: string; qty: number }[] = [];
  const orderItems: OrderItem[] = [];
  // Stock level *before* this sale's deduction, per line — compared against
  // the post-deduction level below to alert staff only on the moment a
  // variant actually crosses into low/out-of-stock, not on every sale while
  // it stays there.
  const preSaleLevels: {
    productId: string;
    variantId: string;
    productName: string;
    variantLabel: string;
    stockQtyBefore: number;
    lowStockThreshold: number;
  }[] = [];
  for (const raw of rawItems) {
    if (!raw.productId || !raw.variantId) {
      return NextResponse.json({ ok: false, error: "Invalid item in your cart." }, { status: 400 });
    }
    const product = await getProduct(raw.productId);
    if (!product || !product.active) {
      return NextResponse.json(
        { ok: false, error: "One of the items in your cart is no longer available." },
        { status: 400 },
      );
    }
    const variant = product.variants.find((v) => v.id === raw.variantId);
    if (!variant) {
      return NextResponse.json(
        { ok: false, error: `That size of ${product.name} is no longer available.` },
        { status: 400 },
      );
    }
    const qty = Math.floor(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return NextResponse.json(
        { ok: false, error: `Quantity for ${product.name} is invalid.` },
        { status: 400 },
      );
    }
    const unitPrice = effectivePrice(product, variant);
    amount += unitPrice * qty;
    lines.push(`${qty}x ${product.name} (${variant.label})`);
    stockLines.push({ productId: product.id, variantId: variant.id, qty });
    orderItems.push({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantLabel: variant.label,
      qty,
      unitPrice,
    });
    preSaleLevels.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantLabel: variant.label,
      stockQtyBefore: variant.stockQty,
      lowStockThreshold: variant.lowStockThreshold,
    });
  }

  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
  }

  const reference = `ASHOK-${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.toUpperCase();
  const description = lines.join(", ").slice(0, 200);
  const siteUrl = getSiteUrl(request);

  // Wrapped like the order write below — an uncaught Firestore error here
  // used to surface as a bare 500 with no message for the customer.
  let customer: Awaited<ReturnType<typeof getOrCreateCustomer>>;
  try {
    customer = await getOrCreateCustomer(mobile, { name: body.customerName });
  } catch (error) {
    console.error(
      "[checkout/create-invoice] could not load the customer record:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { ok: false, error: "We couldn't start your order just now — please try again in a moment." },
      { status: 502 },
    );
  }
  const startedAt = nairobiToday();

  // The order is created before stock is touched or TaifaPay is called (not
  // best-effort, unlike the payment record below) for two reasons: stock
  // deduction needs a real order id to correlate its ledger entries against,
  // and — unlike a Firestore hiccup on the payment record, which is
  // recoverable from the order/webhook alone — a checkout with stock
  // reserved or money moving and genuinely no order record at all is a real
  // "where did this sale go" gap. If nothing past this point succeeds, the
  // order is left/marked Cancelled rather than silently vanishing.
  let orderId: string;
  try {
    orderId = await createOrder({
      clientId: mobile,
      clientName: customer.name || mobile,
      item: description,
      stage: "Payment Pending",
      statusNote: "Awaiting payment confirmation",
      startedAt,
      estimatedCompletion: "",
      price: amount,
      currency: "KES",
      balanceDue: amount,
      source: "shop",
      items: orderItems,
    });
  } catch (error) {
    console.error(
      "[checkout/create-invoice] could not create the order record:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { ok: false, error: "We couldn't start your order just now — please try again in a moment." },
      { status: 502 },
    );
  }

  try {
    await deductStockForOrder(stockLines, orderId);
  } catch (error) {
    if (!(error instanceof InsufficientStockError)) {
      console.error(
        "[checkout/create-invoice] stock deduction failed:",
        error instanceof Error ? `${error.name}: ${error.message}` : error,
      );
    }
    const message =
      error instanceof InsufficientStockError
        ? error.message
        : "We couldn't reserve stock for your order just now — please try again in a moment.";
    await updateOrder(orderId, { stage: "Cancelled", statusNote: message }).catch(() => undefined);
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }

  // Best-effort, never blocks the customer, but still awaited rather than
  // fire-and-forget — same reasoning as the webhook's notifyBusiness call:
  // the request handler returning is not a guarantee this runtime keeps
  // executing JS after that, so a detached promise here could get cut off
  // before the email actually goes out. Re-reads each sold product and
  // alerts staff about any variant that just crossed at-or-below its
  // low-stock threshold because of this sale.
  await notifyLowStockIfCrossed(preSaleLevels).catch((notifyError) => {
    console.error(
      "[checkout/create-invoice] low-stock notification failed:",
      notifyError instanceof Error ? notifyError.message : notifyError,
    );
  });

  try {
    const invoice = await createInvoice({
      amount,
      accountReference: reference,
      description,
      customerName: body.customerName?.trim() || undefined,
      customerPhone: mobile,
      externalId: reference,
      returnUrl: `${siteUrl}/checkout/complete`,
      expiresInMinutes: 30,
    });

    await updateOrder(orderId, { transactionId: invoice.transactionId });

    // Best-effort: the order and its stock reservation above already
    // succeeded, so a Firestore hiccup on the payment record alone must
    // never stop the customer from reaching the TaifaPay checkout page —
    // the webhook (app/api/webhooks/taifapay/route.ts) reconciles by
    // transactionId regardless of whether this row exists yet.
    try {
      await createPayment({
        clientId: mobile,
        clientName: customer.name || mobile,
        orderId,
        amount,
        currency: "KES",
        method: "M-Pesa",
        date: startedAt,
        status: "Outstanding",
        transactionId: invoice.transactionId,
      });
    } catch (dbError) {
      console.error(
        "[checkout/create-invoice] Firestore payment write failed (invoice still created):",
        dbError instanceof Error ? dbError.message : dbError,
      );
    }

    return NextResponse.json({
      ok: true,
      transactionId: invoice.transactionId,
      checkoutUrl: invoice.checkoutUrl,
      invoiceNo: invoice.invoiceNo,
      amount: invoice.amount,
      currency: invoice.currency,
      description,
    });
  } catch (error) {
    console.error(
      "[checkout/create-invoice] createInvoice failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    await restockForOrder(stockLines, orderId, "cancellation-restock").catch((restockError) => {
      console.error(
        "[checkout/create-invoice] Failed to restock after a failed invoice — manual correction needed:",
        restockError instanceof Error ? restockError.message : restockError,
      );
    });
    await updateOrder(orderId, {
      stage: "Cancelled",
      statusNote: "Payment could not be started",
    }).catch(() => undefined);
    // Only ever show the customer a message that came from TaifaPay's own
    // API as a real business rejection (see TaifaPayError.customerSafe) —
    // anything else here is an infra/integration detail (auth plumbing, an
    // unexpected non-JSON response, a redirect into the wrong page) that
    // would confuse a customer and expose implementation details for no
    // benefit. The technical detail is already logged above for staff.
    const message =
      error instanceof TaifaPayError && error.customerSafe
        ? error.message
        : "We couldn't start your payment just now — please try again in a moment, or contact us if it keeps happening.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

/** Re-reads each distinct product just sold and emails staff about any
 *  variant whose stock just crossed from above its lowStockThreshold to at
 *  or below it (or to zero) because of this sale — a real transition, not
 *  a "still low" repeat on every subsequent order while it stays there. */
async function notifyLowStockIfCrossed(
  preSaleLevels: {
    productId: string;
    variantId: string;
    productName: string;
    variantLabel: string;
    stockQtyBefore: number;
    lowStockThreshold: number;
  }[],
): Promise<void> {
  const productIds = Array.from(new Set(preSaleLevels.map((l) => l.productId)));
  const products = await Promise.all(productIds.map((id) => getProduct(id)));
  const productById = new Map(products.filter((p): p is NonNullable<typeof p> => p !== null).map((p) => [p.id, p]));

  const crossed = preSaleLevels.filter((level) => {
    if (level.stockQtyBefore <= level.lowStockThreshold) return false; // already low before this sale
    const product = productById.get(level.productId);
    const variant = product?.variants.find((v) => v.id === level.variantId);
    if (!variant) return false;
    return variant.stockQty <= level.lowStockThreshold;
  });

  if (crossed.length === 0) return;

  await sendEmail({
    to: bookingNotifyAddress(),
    subject: `Low stock alert — ${crossed.length} size${crossed.length > 1 ? "s" : ""} just crossed threshold`,
    html: lowStockAlertEmail({
      items: crossed.map((level) => {
        const variant = productById.get(level.productId)?.variants.find((v) => v.id === level.variantId);
        return {
          productName: level.productName,
          variantLabel: level.variantLabel,
          stockQty: variant?.stockQty ?? 0,
          lowStockThreshold: level.lowStockThreshold,
        };
      }),
    }),
  });
}
