import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { createOrder, getOrCreateCustomer, type OrderStage } from "@/lib/db";
import { normalizeKenyanMobile } from "@/lib/sms";

interface OrderBody {
  phone?: string;
  item?: string;
  price?: number;
  balanceDue?: number;
  stage?: OrderStage;
  statusNote?: string;
  estimatedCompletion?: string;
}

const VALID_STAGES: OrderStage[] = [
  "Consultation",
  "Measurements Taken",
  "Cutting",
  "First Fitting",
  "Final Fitting",
  "Ready for Collection",
  "Collected",
  "Payment Pending",
  "Paid",
];

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: OrderBody;
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
    return NextResponse.json({ ok: false, error: "Describe the order item." }, { status: 400 });
  }
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ ok: false, error: "Enter a valid price." }, { status: 400 });
  }
  const balanceDue = Number.isFinite(Number(body.balanceDue)) ? Number(body.balanceDue) : price;
  const stage = VALID_STAGES.includes(body.stage as OrderStage) ? (body.stage as OrderStage) : "Consultation";

  try {
    const customer = await getOrCreateCustomer(phone);
    const startedAt = new Date().toISOString().slice(0, 10);
    const id = await createOrder({
      clientId: phone,
      clientName: customer.name || phone,
      item,
      stage,
      statusNote: body.statusNote?.trim() || stage,
      startedAt,
      estimatedCompletion: body.estimatedCompletion?.trim() || "",
      price,
      currency: "KES",
      balanceDue,
      source: "bespoke",
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/orders] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not create that order." }, { status: 502 });
  }
}
