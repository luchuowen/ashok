import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/otp";
import { updateCustomer } from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = cookies().get("ashok_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in to save your details." }, { status: 401 });
  }

  let body: { name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const patch: { name?: string; email?: string } = {};
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.email === "string") patch.email = body.email.trim();
    await updateCustomer(session.phone, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[portal/profile] write failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save your details. Try again." }, { status: 502 });
  }
}
