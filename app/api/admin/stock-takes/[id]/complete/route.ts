import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getStockTake, completeStockTake } from "@/lib/inventory";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const existing = await getStockTake(params.id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (existing.status !== "In Progress") {
    return NextResponse.json({ ok: false, error: "This stock take is already completed." }, { status: 409 });
  }
  try {
    const stockTake = await completeStockTake(params.id);
    return NextResponse.json({ ok: true, stockTake });
  } catch (error) {
    console.error("[admin/stock-takes/:id/complete] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not complete that stock take." }, { status: 502 });
  }
}
