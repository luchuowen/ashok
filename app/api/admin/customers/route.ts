import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getOrCreateCustomer, listCustomers, searchCustomersByPhone } from "@/lib/db";
import { normalizeKenyanMobile } from "@/lib/sms";

export async function GET(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  try {
    const customers = q ? await searchCustomersByPhone(q) : await listCustomers(50);
    return NextResponse.json({ ok: true, customers });
  } catch (error) {
    console.error("[admin/customers] Firestore read failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load customers." }, { status: 502 });
  }
}

// Lets staff open a brand-new customer record directly (e.g. a walk-in with
// no prior booking or order) so they have somewhere to attach a measurement
// or quote before any online activity exists for that phone number.
export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: { phone?: string; name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const phone = normalizeKenyanMobile(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Enter a valid Kenyan phone number." }, { status: 400 });
  }
  try {
    const customer = await getOrCreateCustomer(phone, { name: body.name, email: body.email });
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    console.error("[admin/customers] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save that customer." }, { status: 502 });
  }
}
