import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getOrder, getOrCreateCustomer, createPayment, updateOrder } from "@/lib/db";
import { createInvoice, TaifaPayError } from "@/lib/taifapay";

/**
 * Generates a TaifaPay payment link for an existing bespoke order (one
 * placed from /admin, which -- unlike a shop checkout -- never gets an
 * invoice of its own). Reuses the exact same createInvoice() call and
 * transactionId linkage the shop checkout flow uses
 * (app/api/checkout/create-invoice/route.ts), so the already-working
 * webhook (app/api/webhooks/taifapay/route.ts) reconciles this the same
 * way once the customer pays: it matches purely on transactionId, with no
 * idea whether the order behind it came from the shop or from staff.
 */
function getSiteUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const order = await getOrder(params.id).catch(() => null);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Could not find that order." }, { status: 404 });
  }
  if (!order.balanceDue || order.balanceDue <= 0) {
    return NextResponse.json({ ok: false, error: "This order has no balance due." }, { status: 400 });
  }

  const reference = `ASHOK-${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.toUpperCase();
  const siteUrl = getSiteUrl(request);

  try {
    const customer = await getOrCreateCustomer(order.clientId);
    const invoice = await createInvoice({
      amount: order.balanceDue,
      accountReference: reference,
      description: order.item,
      customerName: customer.name || undefined,
      customerPhone: order.clientId,
      externalId: reference,
      returnUrl: `${siteUrl}/checkout/complete`,
      // Staff will usually share this over WhatsApp rather than the
      // customer clicking through immediately at a live checkout, so it
      // gets a day instead of the cart's 30 minutes.
      expiresInMinutes: 60 * 24,
    });

    await updateOrder(order.id, { transactionId: invoice.transactionId });
    await createPayment({
      clientId: order.clientId,
      clientName: customer.name || order.clientId,
      orderId: order.id,
      amount: order.balanceDue,
      currency: "KES",
      method: "M-Pesa",
      date: new Date().toISOString().slice(0, 10),
      status: "Outstanding",
      transactionId: invoice.transactionId,
    });

    return NextResponse.json({ ok: true, checkoutUrl: invoice.checkoutUrl });
  } catch (error) {
    console.error(
      "[admin/orders/:id/invoice] createInvoice failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    // Staff-only endpoint: show TaifaPay's own message whenever there is one
    // (including account-configuration errors), since staff are the ones who
    // can act on it — only fall back to the generic line for infra failures.
    const message =
      error instanceof TaifaPayError && error.status && error.status < 500
        ? error.message
        : "Could not generate a payment link just now -- try again in a moment.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
