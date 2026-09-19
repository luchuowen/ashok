import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/otp";
import {
  getOrCreateCustomer,
  listOrdersForCustomer,
  listPaymentsForCustomer,
  listAppointmentsForCustomer,
  listMeasurementsForCustomer,
  listQuotesForCustomer,
  getPreferences,
} from "@/lib/db";

/**
 * One endpoint for the whole client portal (Overview, Orders, Payments,
 * Measurements, Quotes, Preferences, Settings) rather than one per page —
 * every portal page needs the same "who is signed in" check and mostly
 * overlapping data, and a single round trip keeps the client-side portal
 * pages simple (fetch once, read the slice each page needs).
 */
export async function GET() {
  const token = cookies().get("ashok_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ signedIn: false });
  }
  const phone = session.phone;

  try {
    const [customer, orders, payments, appointments, measurements, quotes, preferences] =
      await Promise.all([
        getOrCreateCustomer(phone),
        listOrdersForCustomer(phone),
        listPaymentsForCustomer(phone),
        listAppointmentsForCustomer(phone),
        listMeasurementsForCustomer(phone),
        listQuotesForCustomer(phone),
        getPreferences(phone),
      ]);
    return NextResponse.json({
      signedIn: true,
      phone,
      customer,
      orders,
      payments,
      appointments,
      measurements,
      quotes,
      preferences,
    });
  } catch (error) {
    console.error("[portal/me] Firestore read failed:", error instanceof Error ? error.message : error);
    // Signed in, but the record store is having a bad moment — tell the
    // portal pages so they can show a retry state instead of a false
    // "you have nothing on file yet".
    return NextResponse.json({ signedIn: true, phone, error: "load-failed" }, { status: 200 });
  }
}
