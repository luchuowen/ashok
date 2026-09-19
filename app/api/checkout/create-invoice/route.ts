import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeKenyanMobile } from "@/lib/sms";
import { createInvoice, TaifaPayError } from "@/lib/taifapay";
import { products } from "@/lib/fixtures/products";

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
    const message =
      error instanceof TaifaPayError ? error.message : "Could not start payment. Try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
