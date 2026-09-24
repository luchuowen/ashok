import { NextRequest, NextResponse } from "next/server";
import { getPromo } from "@/lib/promo";
import { evaluatePromo, normalizeCode } from "@/lib/promo-shared";
import { nairobiToday } from "@/lib/dates";

/**
 * POST { code, subtotal, suitsSubtotal } — preview a promo code / gift card
 * against the bag. Only a preview: checkout re-prices the bag server-side
 * and re-validates the code before anything is charged.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { code?: string; subtotal?: number; suitsSubtotal?: number };
  const code = normalizeCode(String(body.code ?? ""));
  if (!code) return NextResponse.json({ ok: false, error: "Enter a code." }, { status: 400 });
  try {
    const promo = await getPromo(code);
    const result = evaluatePromo(promo, { subtotal: Math.max(0, Number(body.subtotal) || 0), suitsSubtotal: Math.max(0, Number(body.suitsSubtotal) || 0) }, nairobiToday());
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, code, discount: result.discount, label: result.label });
  } catch (error) {
    console.error("[checkout/promo] lookup failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Couldn't check that code just now." }, { status: 502 });
  }
}
