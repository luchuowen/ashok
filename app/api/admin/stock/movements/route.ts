import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { listStockMovements } from "@/lib/inventory";

export async function GET(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") || undefined;
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : undefined;
  try {
    const movements = await listStockMovements({ productId, limit });
    return NextResponse.json({ ok: true, movements });
  } catch (error) {
    console.error("[admin/stock/movements] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load stock movements." }, { status: 502 });
  }
}
