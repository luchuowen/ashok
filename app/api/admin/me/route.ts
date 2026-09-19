import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken } from "@/lib/staff-auth";

export async function GET() {
  const token = cookies().get(STAFF_SESSION_COOKIE)?.value;
  return NextResponse.json({ signedIn: verifyStaffSessionToken(token) });
}
