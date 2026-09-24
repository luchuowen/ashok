import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getPromo, listPromos, savePromo } from "@/lib/promo";
import { normalizeCode, type PromoCode } from "@/lib/promo-shared";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isStaffAuthed()) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, promos: await listPromos() });
  } catch (error) {
    console.error("[admin/promo-codes] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load codes." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isStaffAuthed()) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Partial<PromoCode>;
  const code = normalizeCode(String(b.code ?? ""));
  if (code.length < 3) return NextResponse.json({ ok: false, error: "Codes need at least 3 letters or numbers." }, { status: 400 });
  const type = b.kind === "giftcard" || b.type === "fixed" ? "fixed" : "percent";
  const value = Math.round(Number(b.value));
  if (!Number.isFinite(value) || value <= 0 || (type === "percent" && value > 90)) {
    return NextResponse.json({ ok: false, error: type === "percent" ? "Enter a percentage from 1 to 90." : "Enter a KES amount above 0." }, { status: 400 });
  }
  const expiresAt = typeof b.expiresAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.expiresAt) ? b.expiresAt : "";
  try {
    if (await getPromo(code)) return NextResponse.json({ ok: false, error: "That code already exists." }, { status: 409 });
    const now = new Date().toISOString();
    await savePromo({
      code,
      kind: b.kind === "giftcard" ? "giftcard" : "promo",
      type,
      value,
      appliesTo: b.appliesTo === "suits" ? "suits" : "all",
      minSpend: Math.max(0, Math.round(Number(b.minSpend) || 0)),
      active: true,
      expiresAt,
      // Gift cards carry a balance that's drawn down as it's spent (see recordPromoUse).
      maxUses: b.kind === "giftcard" ? 0 : Math.max(0, Math.round(Number(b.maxUses) || 0)),
      uses: 0,
      description: String(b.description ?? "").slice(0, 120),
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    console.error("[admin/promo-codes] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save that code." }, { status: 502 });
  }
}
