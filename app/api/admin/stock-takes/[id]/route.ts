import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getStockTake, recordStockTakeCounts } from "@/lib/inventory";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const stockTake = await getStockTake(params.id);
    if (!stockTake) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, stockTake });
  } catch (error) {
    console.error("[admin/stock-takes/:id] get failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load that stock take." }, { status: 502 });
  }
}

interface CountBody {
  counts?: { productId?: string; variantId?: string; countedQty?: number }[];
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
  let body: CountBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const counts = (body.counts ?? [])
    .filter(
      (c) =>
        typeof c.productId === "string" &&
        typeof c.variantId === "string" &&
        Number.isFinite(Number(c.countedQty)) &&
        Number(c.countedQty) >= 0,
    )
    .map((c) => ({
      productId: c.productId!,
      variantId: c.variantId!,
      countedQty: Math.trunc(Number(c.countedQty)),
    }));
  if (counts.length === 0) {
    return NextResponse.json({ ok: false, error: "No counts to save." }, { status: 400 });
  }
  try {
    await recordStockTakeCounts(params.id, counts);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/stock-takes/:id] save counts failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save those counts." }, { status: 502 });
  }
}
