import { NextRequest, NextResponse } from "next/server";
import { EmailSendError, bookingNotifyAddress, sendEmail } from "@/lib/resend";
import { siteConfig } from "@/lib/content/site";

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
        html: `<div style="font-family:sans-serif;font-size:14px;color:#222;">
          <p>Hi ${escapeHtml(name)},</p>
          <p>We've received your booking request for <strong>${escapeHtml(visitType)}</strong> at <strong>${escapeHtml(slot)}</strong>.</p>
          <p>We'll follow up on WhatsApp (${escapeHtml(siteConfig.phone)}) to confirm the details.</p>
          <p>${escapeHtml(siteConfig.fullName)}<br/>${escapeHtml(siteConfig.address)}</p>
        </div>`,
      });
    }

    return NextResponse.json({ ok: true });
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
}
