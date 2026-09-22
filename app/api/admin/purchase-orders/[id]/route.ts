import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getPurchaseOrder, updatePurchaseOrder, type PurchaseOrderStatus } from "@/lib/inventory";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const purchaseOrder = await getPurchaseOrder(params.id);
    if (!purchaseOrder) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, purchaseOrder });
  } catch (error) {
    console.error("[admin/purchase-orders/:id] get failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load that purchase order." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const existing = await getPurchaseOrder(params.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  let body: { status?: PurchaseOrderStatus; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const patch: { status?: PurchaseOrderStatus; notes?: string } = {};
  if (body.status === "Cancelled") {
    if (existing.status === "Received") {
      return NextResponse.json({ ok: false, error: "A fully received order can't be cancelled." }, { status: 409 });
    }
    patch.status = "Cancelled";
  }
  if (typeof body.notes === "string") patch.notes = body.notes.trim();
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }
  try {
    await updatePurchaseOrder(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/purchase-orders/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that purchase order." }, { status: 502 });
  }
}
