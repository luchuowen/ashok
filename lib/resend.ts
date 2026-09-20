/**
 * Resend (resend.com) — transactional email for the booking form.
 *
 * Requires RESEND_API_KEY (resend.com/api-keys — server-side only, never
 * NEXT_PUBLIC_). EMAIL_FROM must be an address on a domain verified in the
 * Resend dashboard (Domains tab) — an unverified "from" address makes every
 * send fail. BOOKING_NOTIFY_EMAIL is where new-booking notifications land;
 * defaults to the business address in lib/content/site.ts.
 */

import { Resend } from "resend";
import { siteConfig } from "@/lib/content/site";

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

let client: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailSendError("RESEND_API_KEY is not configured on the server.");
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

function getFromAddress(): string {
  // Falls back to Resend's own shared test domain so this never throws
  // before EMAIL_FROM is set — but sends from onboarding@resend.dev will
  // only actually deliver to the account owner's own verified address, so
  // EMAIL_FROM should be set to something on a verified domain in production.
  return process.env.EMAIL_FROM || "Ashok Sunny Tailored <onboarding@resend.dev>";
}

export interface SendEmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: SendEmailAttachment[];
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
    attachments: params.attachments,
  });

  if (error) {
    console.error("[resend] send failed:", error);
    throw new EmailSendError(error.message || "Email send failed.");
  }
  if (!data?.id) {
    console.error("[resend] send returned no id, unexpected response");
  }
}

/** Where new-booking notifications go — defaults to the business inbox. */
export function bookingNotifyAddress(): string {
  return process.env.BOOKING_NOTIFY_EMAIL || siteConfig.email;
}
