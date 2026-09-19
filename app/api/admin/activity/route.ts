import { NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import {
  listRecentOrders,
  listRecentAppointments,
  listRecentPayments,
  listRecentQuotes,
} from "@/lib/db";

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const [orders, appointments, payments, quotes] = await Promise.all([
      listRecentOrders(20),
      listRecentAppointments(20),
      listRecentPayments(20),
      listRecentQuotes(20),
    ]);
    return NextResponse.json({ ok: true, orders, appointments, payments, quotes });
  } catch (error) {
    console.error("[admin/activity] Firestore read failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load recent activity." }, { status: 502 });
  }
}
