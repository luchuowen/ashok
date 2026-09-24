import { NextRequest, NextResponse } from "next/server";
import { listMeasurementsForCustomer } from "@/lib/db";
import { getFitProfile, getSessionPhone, saveFitProfile } from "@/lib/suit-db";
import { hasBlockingIssues, sanitizeFitProfile } from "@/lib/suit/measurements";

export const dynamic = "force-dynamic";

/**
 * GET — the signed-in customer's saved fit profile plus their most recent
 * staff-taken measurement record (offered as "use my measurements on file").
 */
export async function GET() {
  const phone = getSessionPhone();
  if (!phone) return NextResponse.json({ ok: true, signedIn: false });
  try {
    const [profile, measurements] = await Promise.all([getFitProfile(phone), listMeasurementsForCustomer(phone)]);
    const latest = measurements[0] ?? null;
    return NextResponse.json({ ok: true, signedIn: true, profile, onFile: latest });
  } catch (error) {
    console.error("[suits/fit-profile] read failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, signedIn: true, error: "Could not load your saved measurements." }, { status: 502 });
  }
}

/** PUT { profile } — save the customer's fit profile to their record. */
export async function PUT(request: NextRequest) {
  const phone = getSessionPhone();
  if (!phone) return NextResponse.json({ ok: false, error: "Sign in to keep measurements on your record." }, { status: 401 });
  let body: { profile?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const profile = sanitizeFitProfile(body.profile);
  if (!profile || hasBlockingIssues(profile)) {
    return NextResponse.json({ ok: false, error: "Those measurements aren't complete yet." }, { status: 400 });
  }
  try {
    await saveFitProfile(phone, profile);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[suits/fit-profile] save failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save your measurements just now." }, { status: 502 });
  }
}
