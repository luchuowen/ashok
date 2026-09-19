import { NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import {
  getOrCreateCustomer,
  listOrdersForCustomer,
  listPaymentsForCustomer,
  listAppointmentsForCustomer,
  listMeasurementsForCustomer,
  listQuotesForCustomer,
  getPreferences,
} from "@/lib/db";
import { normalizeKenyanMobile } from "@/lib/sms";

export async function GET(_request: Request, { params }: { params: { phone: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const phone = normalizeKenyanMobile(decodeURIComponent(params.phone));
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Invalid phone number." }, { status: 400 });
  }
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
      ok: true,
      customer,
      orders,
      payments,
      appointments,
      measurements,
      quotes,
      preferences,
    });
  } catch (error) {
    console.error(
      "[admin/customers/:phone] Firestore read failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, error: "Could not load that customer." }, { status: 502 });
  }
}
