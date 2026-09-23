import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/otp";
import { getCustomer } from "@/lib/db";

/** Lets client components (Header/Footer) know whether the visitor has a
 * valid ashok_session cookie, without ever exposing it directly — the
 * cookie itself stays httpOnly. */
export async function GET() {
  const token = cookies().get("ashok_session")?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ signedIn: false });
  }
  // Best-effort — the Header/Footer account menu falls back to the phone
  // number if this lookup fails or the customer never set a name.
  const customer = await getCustomer(session.phone).catch(() => null);
  return NextResponse.json({ signedIn: true, phone: session.phone, name: customer?.name || null });
}
