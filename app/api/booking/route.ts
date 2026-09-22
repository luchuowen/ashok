import { NextRequest, NextResponse } from "next/server";
import { bookingNotifyAddress, sendEmail } from "@/lib/resend";
import { bookingReceivedEmail } from "@/lib/email-templates";
import { siteConfig } from "@/lib/content/site";
import { createAppointment, getOrCreateCustomer, listScheduledAppointmentsBetween } from "@/lib/db";
import { formatSlot, isOfferedSlot } from "@/lib/booking-slots";
import { normalizeKenyanMobile, sendSms } from "@/lib/sms";

interface BookingBody {
  visitType?: string;
  name?: string;
  phone?: string;
  email?: string;
  note?: string;
  /** ISO date + "HH:MM", Nairobi time — a slot from GET /api/booking/slots. */
  date?: string;
  time?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  let body: BookingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const visitType = body.visitType?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const note = body.note?.trim() ?? "";
  const date = body.date?.trim() ?? "";
  const time = body.time?.trim() ?? "";

  if (!visitType || !name || !phone || !date || !time) {
    return NextResponse.json(
      { ok: false, error: "Fill in a visit type, name, phone and time slot to continue." },
      { status: 400 },
    );
  }
  const normalizedPhone = normalizeKenyanMobile(phone);
  if (!normalizedPhone) {
    return NextResponse.json({ ok: false, error: "Enter a valid Kenyan phone number." }, { status: 400 });
  }
  // Never trust the client's slot: it must be one the schedule offers right
  // now (Nairobi time, inside opening hours, after the lead time).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !isOfferedSlot(date, time)) {
    return NextResponse.json(
      { ok: false, error: "That time is no longer available — pick another slot." },
      { status: 409 },
    );
  }
  const slot = formatSlot(date, time);

  // The appointment record is the booking. It's written first — and is the
  // only step that can fail the request — so what staff see on /admin and
  // what the customer sees in their portal is the truth, with the emails
  // and SMS below as best-effort notifications of that record. (Previously
  // the record was written last and best-effort, after the emails; a
  // Resend outage failed the whole booking and a Firestore hiccup lost it
  // silently after the customer had been told it was confirmed.)
  let appointmentId: string;
  try {
    const clash = await listScheduledAppointmentsBetween(date, date);
    if (clash.some((a) => a.time === time)) {
      return NextResponse.json(
        { ok: false, error: "That time was just taken — pick another slot." },
        { status: 409 },
      );
    }
    const customer = await getOrCreateCustomer(normalizedPhone, { name, email });
    appointmentId = await createAppointment({
      clientId: normalizedPhone,
      clientName: customer.name || name,
      type: "Consultation",
      date,
      time,
      location: siteConfig.address,
      status: "Scheduled",
    });
  } catch (error) {
    console.error("[booking] could not save the appointment:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: "Could not save your booking just now. Try again, or message us on WhatsApp." },
      { status: 502 },
    );
  }

  // Customer SMS confirmation — the channel every booking has (phone is
  // required, email is optional). Best-effort: the booking is saved.
  const smsText =
    `${siteConfig.fullName}: your ${visitType} consultation is booked for ${slot} (EAT) at ${siteConfig.address}. ` +
    `Need to change it? WhatsApp ${siteConfig.phone}.`;
  await sendSms(normalizedPhone, smsText).catch((error) => {
    console.error("[booking] confirmation SMS failed:", error instanceof Error ? `${error.name}: ${error.message}` : error);
  });

  const rows = [
    ["Visit type", visitType],
    ["Name", name],
    ["Phone", normalizedPhone],
    ["Email", email || "—"],
    ["Slot", `${slot} (EAT)`],
    ["Note", note || "—"],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;">${escapeHtml(label)}</td><td style="padding:4px 0;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  try {
    await sendEmail({
      to: bookingNotifyAddress(),
      subject: `New booking — ${name}, ${slot}`,
      replyTo: email || undefined,
      html: `<h2 style="font-family:sans-serif;">New booking</h2><table style="font-family:sans-serif;font-size:14px;">${rows}</table><p style="font-family:sans-serif;font-size:12px;color:#6b6b6b;">Appointment ${escapeHtml(appointmentId)} — manage it on /admin.</p>`,
    });
    if (email) {
      await sendEmail({
        to: email,
        subject: `Booking confirmed — ${siteConfig.fullName}`,
        html: bookingReceivedEmail({ name, visitType, slot: `${slot} (EAT)` }),
      });
    }
  } catch (error) {
    console.error(
      "[booking] email send failed (booking still saved):",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
  }

  return NextResponse.json({ ok: true, appointmentId, slot });
}
