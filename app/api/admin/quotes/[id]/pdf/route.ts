import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/require-staff";
import { getQuote, getOrCreateCustomer } from "@/lib/db";
import { renderQuotePdf } from "@/lib/quote-pdf";

function reference(id: string): string {
  return `Q-${id.slice(-8).toUpperCase()}`;
}

/** Lets staff download the same PDF the email attaches, for manual sharing
 * (WhatsApp, printing) when a customer has no email on file. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffAuthed()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const quote = await getQuote(params.id).catch(() => null);
  if (!quote) {
    return NextResponse.json({ ok: false, error: "Could not find that quote." }, { status: 404 });
  }

  const customer = await getOrCreateCustomer(quote.clientId);
  const pdf = await renderQuotePdf({
    quote,
    customerName: customer.name || quote.clientId,
    customerPhone: quote.clientId,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reference(quote.id)}.pdf"`,
    },
  });
}
