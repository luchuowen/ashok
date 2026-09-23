import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getOrder, getOrCreateCustomer } from "@/lib/db";
import { sendSms, SmsSendError } from "@/lib/sms";
import { sendEmail, EmailSendError } from "@/lib/resend";
import { paymentLinkEmail } from "@/lib/email-templates";

type Channel = "sms" | "email";
const VALID_CHANNELS: Channel[] = ["sms", "email"];

/**
 * Sends an already-generated TaifaPay payment link to the customer, so
 * staff don't have to copy the link out of the read-only field and paste
 * it into a separate SMS/email themselves (see GeneratePaymentLinkControl
 * in app/admin/page.tsx). No "send via WhatsApp" option here — the site's
 * WhatsApp buttons are an on-site form that emails the house (see
 * components/ui/WhatsAppConnect.tsx), not a real WhatsApp Business
 * integration, so there's no API this route could actually hand the link
 * to on that channel.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  let body: { checkoutUrl?: string; channel?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const channel = VALID_CHANNELS.includes(body.channel as Channel) ? (body.channel as Channel) : null;
  if (!channel) {
    return NextResponse.json({ ok: false, error: "Choose SMS or Email." }, { status: 400 });
  }

  // Only ever relay a link this same deploy generated — never an
  // arbitrary URL a caller hands us — so this can't become an open
  // SMS/email relay.
  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(String(body.checkoutUrl));
  } catch {
    return NextResponse.json({ ok: false, error: "Missing or invalid payment link." }, { status: 400 });
  }
  if (checkoutUrl.protocol !== "https:" || !checkoutUrl.hostname.endsWith("taifapay.africa")) {
    return NextResponse.json({ ok: false, error: "That doesn't look like a TaifaPay payment link." }, { status: 400 });
  }

  const order = await getOrder(params.id).catch(() => null);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Could not find that order." }, { status: 404 });
  }

  const customer = await getOrCreateCustomer(order.clientId);
  const amount = `${order.currency} ${order.balanceDue.toLocaleString("en-KE")}`;

  try {
    if (channel === "sms") {
      const message = `Ashok Sunny Tailored: here's your payment link for ${order.item} (${amount}): ${checkoutUrl.toString()}`;
      await sendSms(order.clientId, message);
      return NextResponse.json({ ok: true, sentTo: order.clientId });
    }

    if (!customer.email) {
      return NextResponse.json(
        { ok: false, error: "This customer has no email on file — try SMS instead." },
        { status: 400 },
      );
    }
    await sendEmail({
      to: customer.email,
      subject: `Your payment link from Ashok Sunny Tailored`,
      html: paymentLinkEmail({
        name: customer.name || "there",
        item: order.item,
        amount,
        checkoutUrl: checkoutUrl.toString(),
      }),
    });
    return NextResponse.json({ ok: true, sentTo: customer.email });
  } catch (error) {
    console.error(
      "[admin/orders/:id/invoice/send] failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    const message =
      error instanceof SmsSendError || error instanceof EmailSendError
        ? error.message
        : "Could not send that link just now — try again in a moment.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
