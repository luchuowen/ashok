import { NextRequest, NextResponse } from "next/server";
import { createStaffSessionToken, verifyAdminPassword, STAFF_SESSION_COOKIE } from "@/lib/staff-auth";

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!process.env.ADMIN_PASSWORD) {
    console.error("[admin/login] ADMIN_PASSWORD is not configured on the server.");
    return NextResponse.json(
      { ok: false, error: "Staff sign-in isn't configured yet. Contact the developer." },
      { status: 500 },
    );
  }
  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_SESSION_COOKIE, createStaffSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
