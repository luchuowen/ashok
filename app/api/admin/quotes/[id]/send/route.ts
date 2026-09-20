import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getQuote, getOrCreateCustomer } from "@/lib/db";
import { renderQuotePdf } from "@/lib/quote-pdf";
import { sendEmail, EmailSendError } from "@/lib/resend";
import { quoteEmail } from "@/lib/email-templates";

function reference(id: string): string {
  return `Q-${id.slice(-8).toUpperCase()}`;
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const quote = await getQuote(params.id).catch(() => null);
  if (!quote) {
    return NextResponse.json({ ok: false, error: "Could not find that quote." }, { status: 404 });
  }

  const customer = await getOrCreateCustomer(quote.clientId);
  if (!customer.email) {
    return NextResponse.json(
      { ok: false, error: "This customer has no email on file — download the PDF and share it directly instead." },
      { status: 400 },
    );
  }

  try {
    const pdf = await renderQuotePdf({
      quote,
      customerName: customer.name || quote.clientId,
      customerPhone: quote.clientId,
    });

    await sendEmail({
      to: customer.email,
      subject: `Your quotation from Ashok Sunny Tailored — ${reference(quote.id)}`,
      html: quoteEmail({
        name: customer.name || "there",
        reference: reference(quote.id),
        item: quote.item,
        amount: `${quote.currency} ${quote.amount.toLocaleString("en-KE")}`,
        expiresAt: quote.expiresAt,
      }),
      attachments: [{ filename: `${reference(quote.id)}.pdf`, content: pdf }],
    });

    return NextResponse.json({ ok: true, sentTo: customer.email });
  } catch (error) {
    console.error(
      "[admin/quotes/:id/send] failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    const message =
      error instanceof EmailSendError ? error.message : "Could not send that quote just now — try again in a moment.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
