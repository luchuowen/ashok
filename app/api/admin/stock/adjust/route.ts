import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { adjustStock, InsufficientStockError } from "@/lib/inventory";

interface AdjustBody {
  productId?: string;
  variantId?: string;
  qtyChange?: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  let body: AdjustBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const productId = body.productId?.trim();
  const variantId = body.variantId?.trim();
  if (!productId || !variantId) {
    return NextResponse.json({ ok: false, error: "Missing product or variant." }, { status: 400 });
  }
  const qtyChange = Number(body.qtyChange);
  if (!Number.isFinite(qtyChange) || !Number.isInteger(qtyChange) || qtyChange === 0) {
    return NextResponse.json({ ok: false, error: "Enter a non-zero whole number." }, { status: 400 });
  }
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ ok: false, error: "Give a reason for this adjustment." }, { status: 400 });
  }

  try {
    const { balanceAfter } = await adjustStock({ productId, variantId, qtyChange, reason });
    return NextResponse.json({ ok: true, balanceAfter });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    console.error("[admin/stock/adjust] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not apply that adjustment." }, { status: 502 });
  }
}
