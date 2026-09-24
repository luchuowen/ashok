import { NextRequest, NextResponse } from "next/server";
import { createDesign, getSessionPhone, listDesigns, MAX_SAVED_DESIGNS } from "@/lib/suit-db";
import { priceSuit } from "@/lib/suit/pricing";
import { validateConfigStrict } from "@/lib/suit/rules";

export const dynamic = "force-dynamic";

/** GET — the signed-in customer's saved suit designs. */
export async function GET() {
  const phone = getSessionPhone();
  if (!phone) return NextResponse.json({ ok: false, signedIn: false, designs: [] }, { status: 401 });
  try {
    const designs = await listDesigns(phone);
    return NextResponse.json({ ok: true, signedIn: true, designs });
  } catch (error) {
    console.error("[suits/designs] list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not load your saved designs." }, { status: 502 });
  }
}

/** POST { name, config } — save a design to the customer's record. */
export async function POST(request: NextRequest) {
  const phone = getSessionPhone();
  if (!phone) return NextResponse.json({ ok: false, error: "Sign in to save designs to your record." }, { status: 401 });
  let body: { name?: unknown; config?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const checked = validateConfigStrict(body.config);
  if ("error" in checked) return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });
  const name = String(body.name ?? "").trim().slice(0, 60) || "My suit";
  try {
    const existing = await listDesigns(phone);
    if (existing.length >= MAX_SAVED_DESIGNS) {
      return NextResponse.json(
        { ok: false, error: `You can keep up to ${MAX_SAVED_DESIGNS} saved designs — delete one to save another.` },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const id = await createDesign({
      clientId: phone,
      name,
      config: checked.config,
      unitPrice: priceSuit(checked.config).unitTotal,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[suits/designs] save failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save that design just now — try again." }, { status: 502 });
  }
}
