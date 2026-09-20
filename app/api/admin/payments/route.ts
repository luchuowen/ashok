import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { createPayment, getOrCreateCustomer, getOrder, updateOrder, type Payment } from "@/lib/db";
import { normalizeKenyanMobile } from "@/lib/sms";

const VALID_METHODS: Payment["method"][] = ["Cash", "Bank Transfer", "M-Pesa", "Card"];

interface PaymentBody {
  phone?: string;
  orderId?: string;
  amount?: number;
  method?: Payment["method"];
  note?: string;
}

/**
 * Records a payment staff took outside the payment gateway -- cash handed
 * over in the atelier, a direct bank transfer, an M-Pesa paybill payment
 * read off a receipt -- as opposed to a TaifaPay-generated link, which
 * reconciles itself via the webhook (see
 * app/api/admin/orders/[id]/invoice/route.ts and
 * app/api/webhooks/taifapay/route.ts). This one is staff vouching for the
 * money having actually arrived, so it's recorded as "Paid" immediately,
 * and — when tied to an order — reduces that order's balance right away.
 */
export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: PaymentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const phone = normalizeKenyanMobile(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Enter a valid Kenyan phone number." }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: "Enter a valid amount." }, { status: 400 });
  }
  const method = VALID_METHODS.includes(body.method as Payment["method"])
    ? (body.method as Payment["method"])
    : null;
  if (!method) {
    return NextResponse.json({ ok: false, error: "Choose a payment method." }, { status: 400 });
  }

  try {
    const customer = await getOrCreateCustomer(phone);
    let orderId = "";
    if (body.orderId) {
      const order = await getOrder(body.orderId);
      if (!order || order.clientId !== phone) {
        return NextResponse.json({ ok: false, error: "That order doesn't belong to this customer." }, { status: 400 });
      }
      orderId = order.id;
      const newBalance = Math.max(0, order.balanceDue - amount);
      await updateOrder(order.id, { balanceDue: newBalance });
    }

    const note = body.note?.trim();
    const id = await createPayment({
      clientId: phone,
      clientName: customer.name || phone,
      orderId,
      amount,
      currency: "KES",
      method,
      date: new Date().toISOString().slice(0, 10),
      status: "Paid",
      ...(note ? { note } : {}),
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/payments] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not record that payment." }, { status: 502 });
  }
}
