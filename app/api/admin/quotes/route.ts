import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { createQuote, getOrCreateCustomer } from "@/lib/db";
import { normalizeKenyanMobile } from "@/lib/sms";

interface QuoteBody {
  phone?: string;
  item?: string;
  amount?: number;
  expiresInDays?: number;
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: QuoteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const phone = normalizeKenyanMobile(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Enter a valid Kenyan phone number." }, { status: 400 });
  }
  const item = body.item?.trim();
  if (!item) {
    return NextResponse.json({ ok: false, error: "Describe the quoted item." }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: "Enter a valid amount." }, { status: 400 });
  }
  const expiresInDays = Number.isFinite(Number(body.expiresInDays)) ? Number(body.expiresInDays) : 14;

  try {
    const customer = await getOrCreateCustomer(phone);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    const id = await createQuote({
      clientId: phone,
      clientName: customer.name || phone,
      item,
      amount,
      currency: "KES",
      status: "Pending",
      issuedAt: issuedAt.toISOString().slice(0, 10),
      expiresAt: expiresAt.toISOString().slice(0, 10),
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/quotes] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not create that quote." }, { status: 502 });
  }
}
