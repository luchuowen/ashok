import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { listSuppliers, createSupplier } from "@/lib/inventory";

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const suppliers = await listSuppliers();
    return NextResponse.json({ ok: true, suppliers });
  } catch (error) {
    console.error("[admin/suppliers] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load suppliers." }, { status: 502 });
  }
}

interface SupplierBody {
  name?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: SupplierBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "Enter a supplier name." }, { status: 400 });
  }
  try {
    const id = await createSupplier({
      name,
      ...(body.contactName?.trim() ? { contactName: body.contactName.trim() } : {}),
      ...(body.phone?.trim() ? { phone: body.phone.trim() } : {}),
      ...(body.email?.trim() ? { email: body.email.trim() } : {}),
      ...(body.notes?.trim() ? { notes: body.notes.trim() } : {}),
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/suppliers] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not create that supplier." }, { status: 502 });
  }
}
