import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeKenyanMobile } from "@/lib/sms";
import { createInvoice, TaifaPayError } from "@/lib/taifapay";
import { products } from "@/lib/fixtures/products";
import { createOrder, createPayment, getOrCreateCustomer } from "@/lib/db";

interface CartItemInput {
  productId?: string;
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

  const rawItems = Array.isArray(body.items) ? body.items : [];
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

  // Recompute the amount server-side from the product catalogue — the
  // Phase 1 cart is plain client-side React state (see app/cart-context.tsx),
  // so it is not a source of truth we can trust for what the customer pays.
  let amount = 0;
  const lines: string[] = [];
  for (const raw of rawItems) {
    const product = products.find((p) => p.id === raw.productId);
    if (!product) {
      return NextResponse.json(
        { ok: false, error: "One of the items in your cart is no longer available." },
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
    amount += product.price * qty;
    lines.push(`${qty}x ${product.name}`);
  }

  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
  }

  const reference = `ASHOK-${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.toUpperCase();
  const description = lines.join(", ").slice(0, 200);
  const siteUrl = getSiteUrl(request);

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

    // Record a pending order + payment so this purchase shows up for staff
    // on /admin immediately, and on the customer's portal once the TaifaPay
    // webhook confirms the money actually moved (see
    // app/api/webhooks/taifapay/route.ts). Best-effort: the invoice above
    // already succeeded, so a Firestore hiccup here must never stop the
    // customer from reaching the TaifaPay checkout page.
    try {
      const customer = await getOrCreateCustomer(mobile, { name: body.customerName });
      const startedAt = new Date().toISOString().slice(0, 10);
      await createOrder({
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
        transactionId: invoice.transactionId,
      });
      await createPayment({
        clientId: mobile,
        clientName: customer.name || mobile,
        orderId: reference,
        amount,
        currency: "KES",
        method: "M-Pesa",
        date: startedAt,
        status: "Outstanding",
        transactionId: invoice.transactionId,
      });
    } catch (dbError) {
      console.error(
        "[checkout/create-invoice] Firestore write failed (invoice still created):",
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
