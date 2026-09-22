import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { updateSupplier, type Supplier } from "@/lib/inventory";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: Partial<Supplier>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const patch: Partial<Supplier> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.contactName === "string") patch.contactName = body.contactName.trim();
  if (typeof body.phone === "string") patch.phone = body.phone.trim();
  if (typeof body.email === "string") patch.email = body.email.trim();
  if (typeof body.notes === "string") patch.notes = body.notes.trim();
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }
  try {
    await updateSupplier(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/suppliers/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that supplier." }, { status: 502 });
  }
}
