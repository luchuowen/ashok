import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, verifyOtpToken } from "@/lib/otp";
import { getCustomer } from "@/lib/db";

const REASON_MESSAGE: Record<string, string> = {
  malformed: "That code has expired — request a new one.",
  tampered: "That code has expired — request a new one.",
  expired: "That code has expired — request a new one.",
  "phone-mismatch": "That code doesn't match this phone number.",
  "code-mismatch": "Incorrect code — check and try again.",
};

export async function POST(request: NextRequest) {
  let body: { phone?: string; code?: string; token?: string; intent?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { phone, code, token, intent } = body;
  if (!phone || !code || !token) {
    return NextResponse.json({ ok: false, error: "Missing phone, code or token." }, { status: 400 });
  }

  const result = verifyOtpToken(token, phone, code.trim());
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: REASON_MESSAGE[result.reason] ?? "Could not verify that code." },
      { status: 400 },
    );
  }

  if (intent === "register") {
    // Registering on a phone that already has a customer record — tell them
    // to sign in instead rather than silently reusing the existing account.
    // Best-effort: a lookup failure here shouldn't block a legitimate
    // registration, so fall through to creating the session on error.
    let existing = null;
    try {
      existing = await getCustomer(phone);
    } catch {
      existing = null;
    }
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          accountExists: true,
          error: "An account with this number already exists — sign in instead.",
        },
        { status: 409 },
      );
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("ashok_session", createSessionToken(phone), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
