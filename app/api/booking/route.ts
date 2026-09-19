import { NextRequest, NextResponse } from "next/server";
import { EmailSendError, bookingNotifyAddress, sendEmail } from "@/lib/resend";
import { bookingReceivedEmail } from "@/lib/email-templates";
import { siteConfig } from "@/lib/content/site";
import { createAppointment, getOrCreateCustomer } from "@/lib/db";
import { normalizeKenyanMobile } from "@/lib/sms";

interface BookingBody {
  visitType?: string;
  name?: string;
  phone?: string;
  email?: string;
  note?: string;
  slot?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Turns a booking-page slot like "Tue 10:00" into the next real calendar
 * occurrence of that weekday/time (ISO date + 24h time), so the record we
 * write to Firestore — and everything downstream that reads it (the portal
 * appointments page, the "Add to Calendar" link) — has an actual date
 * instead of a bare weekday label. Falls back to today if the slot doesn't
 * parse, rather than failing the booking.
 */
function resolveSlot(slot: string): { date: string; time: string } {
  const match = slot.match(/^(\w{3})\s+(\d{1,2}):(\d{2})$/);
  const today = new Date();
  if (!match) {
    return { date: today.toISOString().slice(0, 10), time: "10:00" };
  }
  const [, dayAbbr, hh, mm] = match;
  const targetDow = WEEKDAYS.indexOf(dayAbbr!);
  if (targetDow === -1) {
    return { date: today.toISOString().slice(0, 10), time: `${hh}:${mm}` };
  }
  const result = new Date(today);
  let diff = targetDow - today.getDay();
  if (diff < 0) diff += 7;
  result.setDate(today.getDate() + diff);
  return { date: result.toISOString().slice(0, 10), time: `${hh!.padStart(2, "0")}:${mm}` };
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
  const slot = body.slot?.trim() ?? "";

  if (!visitType || !name || !phone || !slot) {
    return NextResponse.json(
      { ok: false, error: "Fill in a visit type, name, phone and time slot to continue." },
      { status: 400 },
    );
  }

  const rows = [
    ["Visit type", visitType],
    ["Name", name],
    ["Phone", phone],
    ["Email", email || "—"],
    ["Slot", slot],
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
      subject: `New booking request — ${name}`,
      replyTo: email || undefined,
      html: `<h2 style="font-family:sans-serif;">New booking request</h2><table style="font-family:sans-serif;font-size:14px;">${rows}</table>`,
    });

    if (email) {
      await sendEmail({
        to: email,
        subject: `Booking received — ${siteConfig.fullName}`,
        html: bookingReceivedEmail({ name, visitType, slot }),
      });
    }
  } catch (error) {
    console.error(
      "[booking] email send failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    const message =
      error instanceof EmailSendError
        ? "Could not send your booking confirmation. Try again, or message us on WhatsApp."
        : "Could not submit your booking. Try again, or message us on WhatsApp.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  // Record the appointment so staff see it on /admin and — once the
  // customer signs in with this same phone — it shows on their portal.
  // Best-effort: the booking above already succeeded and the customer's
  // confirmation email is already sent, so a Firestore hiccup here must
  // never turn into a failed booking from the customer's point of view.
  const normalizedPhone = normalizeKenyanMobile(phone);
  if (normalizedPhone) {
    try {
      const customer = await getOrCreateCustomer(normalizedPhone, { name, email });
      const { date, time } = resolveSlot(slot);
      await createAppointment({
        clientId: normalizedPhone,
        clientName: customer.name || name,
        type: "Consultation",
        date,
        time,
        location: siteConfig.address,
        status: "Scheduled",
      });
    } catch (error) {
      console.error(
        "[booking] Firestore write failed (booking still succeeded):",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
