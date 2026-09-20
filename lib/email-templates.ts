/**
 * HTML email templates — kept separate from the API routes that send them
 * so the markup doesn't clutter the request-handling logic. Table-based
 * layout with inline styles and hex colors throughout (not the site's CSS
 * variables/Tailwind classes) because email clients strip <style> blocks
 * and don't understand custom properties. Fraunces/Work Sans are declared
 * with system-font fallbacks since most email clients ignore @font-face.
 */

const SITE_URL = "https://ashok.navac.co.ke";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const INK = "#14120f";
const CREAM = "#f5f4ef";
const OXBLOOD = "#8a4432";
const MUTED = "#5b5648";
const LINE = "#ddd3c1";
const PAPER = "#ffffff";

const DISPLAY_FONT = "'Fraunces', Georgia, 'Times New Roman', serif";
const BODY_FONT = "'Work Sans', Arial, Helvetica, sans-serif";

export interface BookingReceivedEmailParams {
  name: string;
  visitType: string;
  slot: string;
}

/** "Concept B — The Atelier Card": centered ink header with the logo badge,
 * a Fraunces headline, a bordered detail card, and a dark footer matching
 * the site's own (social row, hairline, address, why-you-got-this line). */
export interface QuoteEmailParams {
  name: string;
  reference: string;
  item: string;
  amount: string;
  expiresAt: string;
}

/** Accompanies the quote PDF attachment — short, points to the PDF for the
 * full breakdown rather than repeating the table in the email body. */
export function quoteEmail({ name, reference, item, amount, expiresAt }: QuoteEmailParams): string {
  const safeName = escapeHtml(name);
  const safeItem = escapeHtml(item);
  const safeAmount = escapeHtml(amount);
  const safeRef = escapeHtml(reference);
  const safeExpires = escapeHtml(expiresAt);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your quotation — Ashok Sunny Tailored</title>
</head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${BODY_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:100%; background:${CREAM};">

<tr><td style="background:${INK}; padding:40px 32px; text-align:center;">
  <img src="${SITE_URL}/email/logo-badge.png" width="56" height="56" alt="Ashok Sunny Tailored" style="display:inline-block; border-radius:12px;" />
  <p style="font-family:${DISPLAY_FONT}; font-style:italic; color:${CREAM}; font-size:15px; letter-spacing:0.03em; margin:14px 0 0;">Ashok Sunny Tailored</p>
</td></tr>

<tr><td style="padding:44px 40px 20px; text-align:center;">
  <p style="font-family:${BODY_FONT}; font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:${OXBLOOD}; margin:0 0 14px;">Quotation ${safeRef}</p>
  <p style="font-family:${DISPLAY_FONT}; font-size:26px; line-height:1.3; margin:0 0 16px; color:${INK};">Hi ${safeName}, here's your quote.</p>
  <p style="font-family:${BODY_FONT}; font-size:14px; color:${MUTED}; line-height:1.7; margin:0 auto 8px; max-width:420px;">The full breakdown is in the attached PDF — feel free to forward it on WhatsApp. It's valid until ${safeExpires}.</p>
</td></tr>

<tr><td style="padding:8px 40px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}; border:1px solid ${LINE};">
    <tr><td style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">Item</td>
        <td align="right" style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">${safeItem}</td></tr>
    <tr><td style="padding:16px 24px; font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">Amount</td>
        <td align="right" style="padding:16px 24px; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">${safeAmount}</td></tr>
  </table>
</td></tr>

<tr><td style="padding:32px 40px 44px; text-align:center;">
  <p style="font-family:${BODY_FONT}; font-size:12px; color:${MUTED}; margin:0;">Reply to this email or message us on WhatsApp to confirm.</p>
</td></tr>

<tr><td style="background:${INK}; padding:32px 40px; text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
    <tr>
      <td style="padding:0 5px;"><a href="#" style="text-decoration:none;"><img src="${SITE_URL}/email/social-instagram.png" width="16" height="16" alt="Instagram" style="display:block;" /></a></td>
      <td style="padding:0 5px;"><a href="#" style="text-decoration:none;"><img src="${SITE_URL}/email/social-facebook.png" width="16" height="16" alt="Facebook" style="display:block;" /></a></td>
    </tr>
  </table>
  <div style="border-top:1px solid rgba(245,244,239,0.15); width:80px; margin:0 auto 16px;"></div>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0 0 4px;">Ridgeways, Nairobi &middot; +254 705 706 433</p>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0;">Sent because you requested a quotation from Ashok Sunny Tailored.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function bookingReceivedEmail({ name, visitType, slot }: BookingReceivedEmailParams): string {
  const safeName = escapeHtml(name);
  const safeType = escapeHtml(visitType);
  const safeSlot = escapeHtml(slot);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Booking received — Ashok Sunny Tailored</title>
</head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${BODY_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:100%; background:${CREAM};">

<tr><td style="background:${INK}; padding:40px 32px; text-align:center;">
  <img src="${SITE_URL}/email/logo-badge.png" width="56" height="56" alt="Ashok Sunny Tailored" style="display:inline-block; border-radius:12px;" />
  <p style="font-family:${DISPLAY_FONT}; font-style:italic; color:${CREAM}; font-size:15px; letter-spacing:0.03em; margin:14px 0 0;">Ashok Sunny Tailored</p>
</td></tr>

<tr><td style="padding:44px 40px 20px; text-align:center;">
  <p style="font-family:${BODY_FONT}; font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:${OXBLOOD}; margin:0 0 14px;">Booking Received</p>
  <p style="font-family:${DISPLAY_FONT}; font-size:26px; line-height:1.3; margin:0 0 16px; color:${INK};">Hi ${safeName}, we've noted your request.</p>
  <p style="font-family:${BODY_FONT}; font-size:14px; color:${MUTED}; line-height:1.7; margin:0 auto 8px; max-width:420px;">We've received your request for a ${safeType} visit. We'll follow up on WhatsApp to confirm — here's what you told us.</p>
</td></tr>

<tr><td style="padding:8px 40px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}; border:1px solid ${LINE};">
    <tr><td style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">Visit type</td>
        <td align="right" style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">${safeType}</td></tr>
    <tr><td style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">Time slot</td>
        <td align="right" style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">${safeSlot}</td></tr>
    <tr><td style="padding:16px 24px; font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">Location</td>
        <td align="right" style="padding:16px 24px; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">Ridgeways, Nairobi</td></tr>
  </table>
</td></tr>

<tr><td style="padding:32px 40px 44px; text-align:center;">
  <a href="${SITE_URL}/portal" style="display:inline-block; padding:13px 28px; font-family:${BODY_FONT}; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; background:${OXBLOOD}; color:${CREAM}; text-decoration:none;">View in Your Record</a>
</td></tr>

<tr><td style="background:${INK}; padding:32px 40px; text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
    <tr>
      <td style="padding:0 5px;"><a href="#" style="text-decoration:none;"><img src="${SITE_URL}/email/social-instagram.png" width="16" height="16" alt="Instagram" style="display:block;" /></a></td>
      <td style="padding:0 5px;"><a href="#" style="text-decoration:none;"><img src="${SITE_URL}/email/social-facebook.png" width="16" height="16" alt="Facebook" style="display:block;" /></a></td>
    </tr>
  </table>
  <div style="border-top:1px solid rgba(245,244,239,0.15); width:80px; margin:0 auto 16px;"></div>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0 0 4px;">Ridgeways, Nairobi &middot; +254 705 706 433</p>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0;">Sent because you made a booking request on ashok.navac.co.ke.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
