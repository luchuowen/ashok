import { NextRequest, NextResponse } from "next/server";
import { decodeDesign, encodeDesign } from "@/lib/suit/codec";
import { priceSuit, suitTitle } from "@/lib/suit/pricing";
import { buildSpec, specSummary } from "@/lib/suit/spec";
import { savedDesignEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";
import { formatKes } from "@/lib/currency";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Light abuse guard (per server instance): a handful of sends per IP per hour,
// and the body is a fixed template — nothing user-written is echoed back.
const hits = new Map<string, number[]>();
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

function siteUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

/** POST { email, code, consent } — email a guest their design (Hockerty's "save your designs for later"). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string; consent?: boolean };
  const email = String(body.email ?? "").trim().slice(0, 120);
  if (!EMAIL.test(email)) return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ ok: false, error: "Please agree to us emailing you this design." }, { status: 400 });
  const config = decodeDesign(String(body.code ?? ""));
  if (!config) return NextResponse.json({ ok: false, error: "That design couldn't be read." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return NextResponse.json({ ok: false, error: "Too many emails — please try again later." }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const rows = buildSpec(config).flatMap((g) => g.rows.map((r) => ({ label: r.label, value: r.value }))).slice(0, 18);
  try {
    await sendEmail({
      to: email,
      subject: `Your ${suitTitle(config)} — saved design`,
      html: savedDesignEmail({
        title: suitTitle(config),
        summary: specSummary(config),
        price: formatKes(priceSuit(config).unitTotal),
        link: `${siteUrl(request)}/custom-suits/design?d=${encodeDesign(config)}&step=review`,
        rows,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[suits/email-design] send failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "We couldn't send that email just now — use Share link instead." }, { status: 502 });
  }
}
