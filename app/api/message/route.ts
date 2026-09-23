import { NextRequest, NextResponse } from "next/server";
import { EmailSendError, bookingNotifyAddress, sendEmail } from "@/lib/resend";
import { siteConfig } from "@/lib/content/site";
import { createMessage } from "@/lib/db";

interface MessageBody {
  name?: string;
  contact?: string;
  message?: string;
  context?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Generic "message the house" form — replaces the old wa.me hand-off.
 * Everything now lands as an email to the house instead of opening an
 * external WhatsApp tab, so there's a record of every enquiry.
 */
export async function POST(request: NextRequest) {
  let body: MessageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const contact = body.contact?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const context = body.context?.trim() ?? "";

  if (!message) {
    return NextResponse.json(
      { ok: false, error: "Add a message before sending." },
      { status: 400 },
    );
  }

  const rows = [
    ["Name", name || "—"],
    ["Contact", contact || "—"],
    ["Regarding", context || "—"],
    ["Message", message],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  // Best-effort record so this shows up in the staff Recent Activity feed
  // too, not only as an email — see lib/db.ts's own note on writes here
  // never being allowed to break the flow that already works without them.
  await createMessage({
    clientId: contact,
    clientName: name,
    context: context || "Message",
    message,
    createdAt: new Date().toISOString(),
  }).catch((err) => {
    console.error("[api/message] activity log failed (email still sent):", err instanceof Error ? err.message : err);
  });

  try {
    await sendEmail({
      to: bookingNotifyAddress(),
      subject: `New message from the site${name ? ` — ${name}` : ""}`,
      replyTo: looksLikeEmail(contact) ? contact : undefined,
      html: `<h2 style="font-family:sans-serif;">New message</h2><table style="font-family:sans-serif;font-size:14px;">${rows}</table>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EmailSendError) {
      console.error("[api/message]", err.message);
    } else {
      console.error("[api/message] unexpected error", err);
    }
    return NextResponse.json(
      { ok: false, error: `Could not send your message. Try again, or call ${siteConfig.phone}.` },
      { status: 500 },
    );
  }
}
