import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getPurchaseOrder, receivePurchaseOrder } from "@/lib/inventory";

interface ReceiptInput {
  productId?: string;
  variantId?: string;
  qty?: number;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const existing = await getPurchaseOrder(params.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (existing.status === "Cancelled") {
    return NextResponse.json({ ok: false, error: "This purchase order was cancelled." }, { status: 409 });
  }
  if (existing.status === "Received") {
    return NextResponse.json({ ok: false, error: "This purchase order is already fully received." }, { status: 409 });
  }
  let body: { receipts?: ReceiptInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const receipts = (body.receipts ?? [])
    .filter((r) => typeof r.productId === "string" && typeof r.variantId === "string" && Number(r.qty) > 0)
    .map((r) => ({ productId: r.productId!, variantId: r.variantId!, qty: Math.trunc(Number(r.qty)) }));
  if (receipts.length === 0) {
    return NextResponse.json({ ok: false, error: "Enter at least one received quantity." }, { status: 400 });
  }
  try {
    const purchaseOrder = await receivePurchaseOrder(params.id, receipts);
    return NextResponse.json({ ok: true, purchaseOrder });
  } catch (error) {
    console.error("[admin/purchase-orders/:id/receive] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not record that receipt." }, { status: 502 });
  }
}
