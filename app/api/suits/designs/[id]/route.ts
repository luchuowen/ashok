import { NextRequest, NextResponse } from "next/server";
import { deleteDesign, getSessionPhone, updateDesign } from "@/lib/suit-db";
import { priceSuit } from "@/lib/suit/pricing";
import { validateConfigStrict } from "@/lib/suit/rules";

/** PATCH { name?, config? } — rename or overwrite one of the customer's own designs. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const phone = getSessionPhone();
  if (!phone) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  let body: { name?: unknown; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 60) || "My suit";
  if (body.config !== undefined) {
    const checked = validateConfigStrict(body.config);
    if ("error" in checked) return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });
    patch.config = checked.config;
    patch.unitPrice = priceSuit(checked.config).unitTotal;
  }
  try {
    const ok = await updateDesign(params.id, phone, patch);
    if (!ok) return NextResponse.json({ ok: false, error: "Design not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[suits/designs/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not update that design." }, { status: 502 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const phone = getSessionPhone();
  if (!phone) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  try {
    const ok = await deleteDesign(params.id, phone);
    if (!ok) return NextResponse.json({ ok: false, error: "Design not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[suits/designs/:id] delete failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not delete that design." }, { status: 502 });
  }
}
