import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeKenyanMobile } from "@/lib/sms";
import { createInvoice, TaifaPayError } from "@/lib/taifapay";
import { deductStockForOrder, effectivePrice, getProduct, restockForOrder, InsufficientStockError } from "@/lib/inventory";
import { getSessionPhone } from "@/lib/suit-db";
import {
  getCustomer,
  claimOrderRestock,
  createOrder,
  createPayment,
  getOrCreateCustomer,
  listMeasurementsForCustomer,
  updateOrder,
  type OrderDelivery,
  type OrderItem,
  type SuitOrderLine,
} from "@/lib/db";
import { CATALOGUE_VERSION, DELIVERY_METHODS, MAX_SUITS_PER_LINE } from "@/lib/suit/catalogue";
import { depositFor, isDeliveryMethod, leadTimeDays, priceSuit, suitTitle } from "@/lib/suit/pricing";
import { validateConfigStrict } from "@/lib/suit/rules";
import { buildSpec, specSummary } from "@/lib/suit/spec";
import { validateFitProfile, sanitizeFitProfile } from "@/lib/suit/measurements";
import { bookingNotifyAddress, sendEmail } from "@/lib/resend";
import { lowStockAlertEmail } from "@/lib/email-templates";
import { nairobiToday } from "@/lib/dates";

interface CartItemInput {
  productId?: string;
  variantId?: string;
  qty?: number;
}

const MAX_QTY_PER_ITEM = 20;
const MAX_SUIT_LINES = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface SuitLineInput {
  lineId?: unknown;
  config?: unknown;
  qty?: unknown;
}

interface DeliveryInput {
  method?: unknown;
  address?: unknown;
  town?: unknown;
  instructions?: unknown;
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getSiteUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  // Fall back to the request's own origin (works for preview deploys too).
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  let body: {
    items?: CartItemInput[];
    suits?: SuitLineInput[];
    fit?: unknown;
    delivery?: DeliveryInput;
    paymentPlan?: unknown;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    acceptTerms?: unknown;
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
  const rawSuits = Array.isArray(body.suits) ? body.suits.filter((x) => x && typeof x === "object") : [];
  if (rawItems.length === 0 && rawSuits.length === 0) {
    return NextResponse.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
  }
  if (rawSuits.length > MAX_SUIT_LINES) {
    return NextResponse.json({ ok: false, error: `Please order at most ${MAX_SUIT_LINES} suit designs at a time.` }, { status: 400 });
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

  // ---- Custom suits: every design is re-validated against the catalogue
  // and re-priced here — the browser's price is never trusted.
  const suitLines: SuitOrderLine[] = [];
  for (const raw of rawSuits) {
    const checked = validateConfigStrict(raw.config);
    if ("error" in checked) {
      return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });
    }
    const qty = Math.floor(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_SUITS_PER_LINE) {
      return NextResponse.json({ ok: false, error: `You can order 1–${MAX_SUITS_PER_LINE} of each suit design.` }, { status: 400 });
    }
    const priced = priceSuit(checked.config);
    const title = suitTitle(checked.config);
    suitLines.push({
      lineId: clip(raw.lineId, 64) || `suit-${suitLines.length + 1}`,
      title,
      summary: specSummary(checked.config),
      qty,
      unitPrice: priced.unitTotal,
      priceLines: priced.lines,
      config: checked.config,
      spec: buildSpec(checked.config),
      leadTimeDays: leadTimeDays(checked.config),
    });
    amount += priced.unitTotal * qty;
    lines.unshift(`${qty}x ${title}`);
  }
  const hasSuits = suitLines.length > 0;

  // ---- Fit profile (required for suits).
  const fitProfile = hasSuits ? sanitizeFitProfile(body.fit) : null;
  if (hasSuits) {
    const fitErrors = validateFitProfile(fitProfile).filter((i) => i.severity === "error");
    if (!fitProfile || fitErrors.length) {
      return NextResponse.json(
        { ok: false, error: fitErrors[0]?.message ?? "Add your measurements, or choose to be measured at the atelier." },
        { status: 400 },
      );
    }
    if (fitProfile.method === "onfile") {
      const onFile = await listMeasurementsForCustomer(mobile).catch(() => []);
      if (!onFile.some((m) => m.id === fitProfile.onFileId)) {
        return NextResponse.json(
          { ok: false, error: "We couldn't find measurements on file for this phone number — choose another measuring option." },
          { status: 400 },
        );
      }
    }
    if (body.acceptTerms !== true) {
      return NextResponse.json({ ok: false, error: "Please accept the made-to-measure terms to continue." }, { status: 400 });
    }
  }

  // ---- Delivery (required for suits, optional otherwise).
  let delivery: OrderDelivery | undefined;
  if (body.delivery && body.delivery.method !== undefined) {
    if (!isDeliveryMethod(body.delivery.method)) {
      return NextResponse.json({ ok: false, error: "Choose how you'd like to receive your order." }, { status: 400 });
    }
    const method = DELIVERY_METHODS.find((d) => d.id === body.delivery!.method)!;
    delivery = { method: method.id, label: method.label, fee: method.fee };
    if (method.id !== "collect") {
      const address = clip(body.delivery.address, 200);
      const town = clip(body.delivery.town, 80);
      if (address.length < 4 || town.length < 2) {
        return NextResponse.json({ ok: false, error: "Enter a delivery address and town." }, { status: 400 });
      }
      delivery.address = address;
      delivery.town = town;
    }
    const instructions = clip(body.delivery.instructions, 300);
    if (instructions) delivery.instructions = instructions;
  } else if (hasSuits) {
    return NextResponse.json({ ok: false, error: "Choose how you'd like to receive your suit." }, { status: 400 });
  }
  if (delivery?.fee) {
    amount += delivery.fee;
    lines.push(`${delivery.method === "nairobi" ? "Nairobi delivery" : "Courier"}`);
  }

  const customerEmail = clip(body.customerEmail, 120);
  if (customerEmail && !EMAIL_PATTERN.test(customerEmail)) {
    return NextResponse.json({ ok: false, error: "That email address doesn't look right." }, { status: 400 });
  }

  const paymentPlan: "full" | "deposit" = hasSuits && body.paymentPlan === "deposit" ? "deposit" : "full";
  const amountDueNow = paymentPlan === "deposit" ? depositFor(amount) : amount;

  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
  }

  const reference = `ASHOK-${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.toUpperCase();
  const description = `${paymentPlan === "deposit" ? "50% deposit: " : ""}${lines.join(", ")}`.slice(0, 200);
  const siteUrl = getSiteUrl(request);

  // Wrapped like the order write below — an uncaught Firestore error here
  // used to surface as a bare 500 with no message for the customer.
  let customer: Awaited<ReturnType<typeof getOrCreateCustomer>>;
  try {
    // Checkout is unauthenticated, so an email typed here only lands on the
    // customer record when it can't hijack someone else's: a brand-new
    // customer, one with no email yet, or the signed-in owner of this number.
    // It's always kept on the order itself.
    const existing = customerEmail ? await getCustomer(mobile) : null;
    const emailForRecord =
      customerEmail && (!existing || !existing.email || getSessionPhone() === mobile) ? customerEmail : undefined;
    customer = await getOrCreateCustomer(mobile, { name: body.customerName, email: emailForRecord });
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
    const leadDays = Math.max(0, ...suitLines.map((l) => l.leadTimeDays)) + (fitProfile?.method === "atelier" ? 4 : 0);
    orderId = await createOrder({
      clientId: mobile,
      clientName: customer.name || mobile,
      item: lines.join(", ").slice(0, 300),
      stage: "Payment Pending",
      statusNote: "Awaiting payment confirmation",
      startedAt,
      estimatedCompletion: hasSuits ? addDays(startedAt, leadDays) : "",
      price: amount,
      currency: "KES",
      balanceDue: amount,
      source: hasSuits ? "custom" : "shop",
      ...(orderItems.length ? { items: orderItems } : {}),
      ...(hasSuits
        ? {
            suits: suitLines,
            fitProfile: fitProfile!,
            paymentPlan,
            catalogueVersion: CATALOGUE_VERSION,
          }
        : {}),
      ...(delivery ? { delivery } : {}),
      amountDueNow,
      reference,
      ...(customerEmail ? { customerEmail } : {}),
      createdAt: new Date().toISOString(),
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

  if (stockLines.length) try {
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
  if (preSaleLevels.length) await notifyLowStockIfCrossed(preSaleLevels).catch((notifyError) => {
    console.error(
      "[checkout/create-invoice] low-stock notification failed:",
      notifyError instanceof Error ? notifyError.message : notifyError,
    );
  });

  try {
    const invoice = await createInvoice({
      amount: amountDueNow,
      accountReference: reference,
      description,
      customerName: body.customerName?.trim() || undefined,
      customerEmail: customerEmail || undefined,
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
        amount: amountDueNow,
        currency: "KES",
        method: "M-Pesa",
        date: startedAt,
        status: "Outstanding",
        transactionId: invoice.transactionId,
        ...(paymentPlan === "deposit" ? { note: "50% deposit at checkout" } : {}),
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
      orderId,
      reference,
      total: amount,
      amountDueNow,
      balanceAfterPayment: amount - amountDueNow,
      paymentPlan,
      hasSuits,
      fitMethod: fitProfile?.method ?? null,
    });
  } catch (error) {
    console.error(
      "[checkout/create-invoice] createInvoice failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    if (stockLines.length && (await claimOrderRestock(orderId).catch(() => false))) await restockForOrder(stockLines, orderId, "cancellation-restock").catch((restockError) => {
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
