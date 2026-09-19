import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/otp";
import { adminDb } from "@/lib/firebase-admin";
import { updateQuote, type QuoteStatus } from "@/lib/db";

const VALID_DECISIONS: QuoteStatus[] = ["Approved", "Declined"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get("ashok_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in to respond to a quote." }, { status: 401 });
  }

  let body: { status?: QuoteStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!body.status || !VALID_DECISIONS.includes(body.status)) {
    return NextResponse.json({ ok: false, error: "Invalid decision." }, { status: 400 });
  }

  try {
    // Confirm this quote actually belongs to the signed-in customer before
    // letting them change its status — the id alone isn't proof of
    // ownership.
    const snap = await adminDb().collection("quotes").doc(params.id).get();
    if (!snap.exists || snap.data()?.clientId !== session.phone) {
      return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
    }
    await updateQuote(params.id, { status: body.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[portal/quotes/:id] update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save your decision. Try again." }, { status: 502 });
  }
}
