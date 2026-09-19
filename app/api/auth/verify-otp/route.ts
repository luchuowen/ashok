import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, verifyOtpToken } from "@/lib/otp";

const REASON_MESSAGE: Record<string, string> = {
  malformed: "That code has expired — request a new one.",
  tampered: "That code has expired — request a new one.",
  expired: "That code has expired — request a new one.",
  "phone-mismatch": "That code doesn't match this phone number.",
  "code-mismatch": "Incorrect code — check and try again.",
};

export async function POST(request: NextRequest) {
  let body: { phone?: string; code?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { phone, code, token } = body;
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
