import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { listStockTakes, startStockTake } from "@/lib/inventory";

export async function GET() {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const stockTakes = await listStockTakes();
    return NextResponse.json({ ok: true, stockTakes });
  } catch (error) {
    console.error("[admin/stock-takes] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load stock takes." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: { notes?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional for this one — starting a stock take needs nothing.
  }
  try {
    const id = await startStockTake(body.notes?.trim() || undefined);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[admin/stock-takes] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not start a stock take." }, { status: 502 });
  }
}
