import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { updateOrder, type Order } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: Partial<Order>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const patch: Partial<Order> = {};
  if (typeof body.stage === "string") patch.stage = body.stage;
  if (typeof body.statusNote === "string") patch.statusNote = body.statusNote;
  if (typeof body.balanceDue === "number" && Number.isFinite(body.balanceDue)) {
    patch.balanceDue = body.balanceDue;
  }
  if (typeof body.estimatedCompletion === "string") patch.estimatedCompletion = body.estimatedCompletion;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }

  try {
    await updateOrder(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/orders/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that order." }, { status: 502 });
  }
}
