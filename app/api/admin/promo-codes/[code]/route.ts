import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { patchPromo } from "@/lib/promo";

/** PATCH { active } — switch a code on or off (codes are never deleted, so order history stays meaningful). */
export async function PATCH(request: NextRequest, { params }: { params: { code: string } }) {
  if (!isStaffAuthed()) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { active?: unknown };
  if (typeof b.active !== "boolean") return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  try {
    const ok = await patchPromo(params.code, { active: b.active });
    if (!ok) return NextResponse.json({ ok: false, error: "Code not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/promo-codes/:code] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that code." }, { status: 502 });
  }
}
