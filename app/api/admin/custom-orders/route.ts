import { NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { listCustomOrders } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Custom suits designed online — the atelier's production queue. */
export async function GET() {
  if (!isStaffAuthed()) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  try {
    const orders = await listCustomOrders();
    return NextResponse.json({ ok: true, orders });
  } catch (error) {
    console.error("[admin/custom-orders] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load custom orders." }, { status: 502 });
  }
}
