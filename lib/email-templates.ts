/**
 * HTML email templates — kept separate from the API routes that send them
 * so the markup doesn't clutter the request-handling logic. Table-based
 * layout with inline styles and hex colors throughout (not the site's CSS
 * variables/Tailwind classes) because email clients strip <style> blocks
 * and don't understand custom properties. Fraunces/Work Sans are declared
 * with system-font fallbacks since most email clients ignore @font-face.
 */

import type { Order } from "@/lib/db";
import { METHOD_LABELS } from "@/lib/suit/measurements";

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

export interface PaymentLinkEmailParams {
  name: string;
  item: string;
  amount: string;
  checkoutUrl: string;
}

/** Sent when staff use the "Send" action next to a generated payment link
 *  (admin order panel) — same visual language as quoteEmail, a single CTA
 *  button through to the TaifaPay-hosted checkout page. */
export function paymentLinkEmail({ name, item, amount, checkoutUrl }: PaymentLinkEmailParams): string {
  const safeName = escapeHtml(name);
  const safeItem = escapeHtml(item);
  const safeAmount = escapeHtml(amount);
  const safeUrl = escapeHtml(checkoutUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your payment link — Ashok Sunny Tailored</title>
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
  <p style="font-family:${BODY_FONT}; font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:${OXBLOOD}; margin:0 0 14px;">Payment Link</p>
  <p style="font-family:${DISPLAY_FONT}; font-size:26px; line-height:1.3; margin:0 0 16px; color:${INK};">Hi ${safeName}, here's your payment link.</p>
  <p style="font-family:${BODY_FONT}; font-size:14px; color:${MUTED}; line-height:1.7; margin:0 auto 8px; max-width:420px;">Tap the button below to pay securely by M-Pesa, card or bank transfer.</p>
</td></tr>

<tr><td style="padding:8px 40px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}; border:1px solid ${LINE};">
    <tr><td style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">Item</td>
        <td align="right" style="padding:16px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">${safeItem}</td></tr>
    <tr><td style="padding:16px 24px; font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">Amount Due</td>
        <td align="right" style="padding:16px 24px; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">${safeAmount}</td></tr>
  </table>
</td></tr>

<tr><td style="padding:32px 40px 44px; text-align:center;">
  <a href="${safeUrl}" style="display:inline-block; background:${OXBLOOD}; color:${CREAM}; font-family:${BODY_FONT}; font-size:13px; text-transform:uppercase; letter-spacing:0.08em; text-decoration:none; padding:14px 32px;">Pay Now</a>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:${MUTED}; margin:16px 0 0;">Or paste this link into your browser: ${safeUrl}</p>
</td></tr>

<tr><td style="background:${INK}; padding:32px 40px; text-align:center;">
  <div style="border-top:1px solid rgba(245,244,239,0.15); width:80px; margin:0 auto 16px;"></div>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0 0 4px;">Ridgeways, Nairobi &middot; +254 705 706 433</p>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0;">Sent because a payment link was generated for your order at Ashok Sunny Tailored.</p>
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

export interface OrderConfirmationEmailParams {
  name: string;
  orderReference: string;
  items: { name: string; variantLabel: string; qty: number; unitPrice: number }[];
  total: string;
}

/** Sent once TaifaPay confirms payment for a shop order (see the
 * "transaction.completed" branch of app/api/webhooks/taifapay/route.ts) —
 * a receipt, not an invitation to pay again, so it never links to checkout. */
export function orderConfirmationEmail({ name, orderReference, items, total }: OrderConfirmationEmailParams): string {
  const safeName = escapeHtml(name);
  const safeRef = escapeHtml(orderReference);
  const safeTotal = escapeHtml(total);
  const rows = items
    .map(
      (item, i) => `
    <tr><td style="padding:16px 24px; ${i < items.length - 1 ? `border-bottom:1px solid ${LINE};` : ""} font-family:${BODY_FONT}; font-size:14px; color:${MUTED};">${escapeHtml(item.qty + "x " + item.name + " (" + item.variantLabel + ")")}</td>
        <td align="right" style="padding:16px 24px; ${i < items.length - 1 ? `border-bottom:1px solid ${LINE};` : ""} font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:500;">KES ${(item.unitPrice * item.qty).toLocaleString("en-KE")}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Order confirmed — Ashok Sunny Tailored</title>
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
  <p style="font-family:${BODY_FONT}; font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:${OXBLOOD}; margin:0 0 14px;">Order ${safeRef}</p>
  <p style="font-family:${DISPLAY_FONT}; font-size:26px; line-height:1.3; margin:0 0 16px; color:${INK};">Thank you, ${safeName} — payment received.</p>
  <p style="font-family:${BODY_FONT}; font-size:14px; color:${MUTED}; line-height:1.7; margin:0 auto 8px; max-width:420px;">We're preparing your order for collection. We'll be in touch on WhatsApp with an update.</p>
</td></tr>

<tr><td style="padding:8px 40px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}; border:1px solid ${LINE};">
    ${rows}
    <tr><td style="padding:16px 24px; background:${CREAM}; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:600;">Total</td>
        <td align="right" style="padding:16px 24px; background:${CREAM}; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:600;">${safeTotal}</td></tr>
  </table>
</td></tr>

<tr><td style="padding:32px 40px 44px; text-align:center;">
  <a href="${SITE_URL}/portal/orders" style="display:inline-block; padding:13px 28px; font-family:${BODY_FONT}; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; background:${OXBLOOD}; color:${CREAM}; text-decoration:none;">View in Your Record</a>
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
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0;">Sent because you placed an order on ashok.navac.co.ke.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export interface LowStockAlertEmailParams {
  items: { productName: string; variantLabel: string; stockQty: number; lowStockThreshold: number }[];
}

/** Internal — sent to staff (bookingNotifyAddress()), not a customer, so it
 * skips the full branded chrome above and just states the facts plainly. */
export function lowStockAlertEmail({ items }: LowStockAlertEmailParams): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 12px 6px 0; color:${INK};">${escapeHtml(item.productName)} — ${escapeHtml(item.variantLabel)}</td>
        <td style="padding:6px 12px; color:${item.stockQty <= 0 ? OXBLOOD : INK}; font-weight:500;">${item.stockQty} left</td>
        <td style="padding:6px 0; color:${MUTED};">threshold ${item.lowStockThreshold}</td>
      </tr>`,
    )
    .join("");

  return `<div style="font-family:${BODY_FONT}; font-size:14px; color:${INK};">
    <p>The following ${items.length > 1 ? "sizes are" : "size is"} at or below their low-stock threshold after a sale:</p>
    <table style="font-size:14px; border-collapse:collapse;">${rows}</table>
    <p style="margin-top:16px;"><a href="${SITE_URL}/admin/stock" style="color:${OXBLOOD};">Open Stock Levels</a> to reorder or adjust.</p>
  </div>`;
}

export interface CustomOrderEmailParams {
  name: string;
  orderReference: string;
  order: Order;
  paidAmount: number;
}

/** Confirmation for a suit designed online — the full specification per
 *  suit, what was paid, what's outstanding and what happens next. Sent to
 *  the customer and (same body) to the atelier as the new-order notice. */
export function customOrderConfirmationEmail({ name, orderReference, order, paidAmount }: CustomOrderEmailParams): string {
  const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
  const atelier = order.fitProfile?.method === "atelier";
  const suits = (order.suits ?? [])
    .map((s) => {
      const groups = s.spec
        .map(
          (g) => `
      <tr><td colspan="2" style="padding:14px 24px 4px; font-family:${BODY_FONT}; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:${OXBLOOD};">${escapeHtml(g.title)}</td></tr>
      ${g.rows
        .map(
          (r) => `<tr><td style="padding:2px 24px; font-family:${BODY_FONT}; font-size:13px; color:${MUTED}; width:40%; vertical-align:top;">${escapeHtml(r.label)}</td><td style="padding:2px 24px 2px 0; font-family:${BODY_FONT}; font-size:13px; color:${INK};">${escapeHtml(r.value)}</td></tr>`,
        )
        .join("")}`,
        )
        .join("");
      return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}; border:1px solid ${LINE}; margin-bottom:16px;">
    <tr><td style="padding:18px 24px; border-bottom:1px solid ${LINE}; font-family:${DISPLAY_FONT}; font-size:18px; color:${INK};">${escapeHtml(`${s.qty}× ${s.title}`)}</td>
        <td align="right" style="padding:18px 24px; border-bottom:1px solid ${LINE}; font-family:${BODY_FONT}; font-size:14px; color:${INK}; font-weight:600;">${kes(s.unitPrice * s.qty)}</td></tr>
    ${groups}
    <tr><td colspan="2" style="padding:0 0 14px;"></td></tr>
  </table>`;
    })
    .join("");
  const shopRows = (order.items ?? [])
    .map((i) => `<tr><td style="padding:8px 24px; font-family:${BODY_FONT}; font-size:13px; color:${MUTED};">${escapeHtml(`${i.qty}x ${i.productName} (${i.variantLabel})`)}</td><td align="right" style="padding:8px 24px; font-family:${BODY_FONT}; font-size:13px;">${kes(i.unitPrice * i.qty)}</td></tr>`)
    .join("");
  const deliveryLine = order.delivery
    ? `${escapeHtml(order.delivery.label)}${order.delivery.address ? ` — ${escapeHtml(order.delivery.address)}, ${escapeHtml(order.delivery.town ?? "")}` : ""}`
    : "Collect at the atelier";
  const next = atelier
    ? "Book your measuring appointment at our Ridgeways atelier — we don't cut until we've measured you."
    : "Our cutter is drafting your pattern now. We'll message you on WhatsApp to arrange your fitting.";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Your suit order — Ashok Sunny Tailored</title></head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${BODY_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:100%;">
<tr><td style="background:${INK}; padding:36px 32px; text-align:center;">
  <img src="${SITE_URL}/email/logo-badge.png" width="56" height="56" alt="Ashok Sunny Tailored" style="display:inline-block; border-radius:12px;" />
  <p style="font-family:${DISPLAY_FONT}; font-style:italic; color:${CREAM}; font-size:15px; margin:14px 0 0;">Ashok Sunny Tailored</p>
</td></tr>
<tr><td style="padding:40px 40px 16px; text-align:center;">
  <p style="font-family:${BODY_FONT}; font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:${OXBLOOD}; margin:0 0 14px;">Order ${escapeHtml(orderReference)}</p>
  <p style="font-family:${DISPLAY_FONT}; font-size:26px; line-height:1.3; margin:0 0 14px; color:${INK};">Thank you, ${escapeHtml(name)} — your suit is on the cutting table.</p>
  <p style="font-family:${BODY_FONT}; font-size:14px; color:${MUTED}; line-height:1.7; margin:0 auto; max-width:440px;">${escapeHtml(next)}</p>
</td></tr>
<tr><td style="padding:16px 40px 0;">${suits}
  ${shopRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}; border:1px solid ${LINE}; margin-bottom:16px;">${shopRows}</table>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}; border:1px solid ${LINE};">
    <tr><td style="padding:10px 24px; font-size:13px; color:${MUTED}; font-family:${BODY_FONT};">Measurements</td><td align="right" style="padding:10px 24px; font-size:13px; font-family:${BODY_FONT};">${escapeHtml(order.fitProfile ? METHOD_LABELS[order.fitProfile.method] : "—")}</td></tr>
    <tr><td style="padding:10px 24px; font-size:13px; color:${MUTED}; font-family:${BODY_FONT};">Delivery</td><td align="right" style="padding:10px 24px; font-size:13px; font-family:${BODY_FONT};">${deliveryLine}</td></tr>
    <tr><td style="padding:10px 24px; font-size:13px; color:${MUTED}; font-family:${BODY_FONT};">Estimated ready</td><td align="right" style="padding:10px 24px; font-size:13px; font-family:${BODY_FONT};">${escapeHtml(order.estimatedCompletion || "We'll confirm at your fitting")}</td></tr>
    <tr><td style="padding:12px 24px; background:${CREAM}; font-size:14px; font-weight:600; font-family:${BODY_FONT};">Order total</td><td align="right" style="padding:12px 24px; background:${CREAM}; font-size:14px; font-weight:600; font-family:${BODY_FONT};">${kes(order.price)}</td></tr>
    <tr><td style="padding:10px 24px; font-size:13px; color:${MUTED}; font-family:${BODY_FONT};">Paid today</td><td align="right" style="padding:10px 24px; font-size:13px; font-family:${BODY_FONT};">${kes(paidAmount)}</td></tr>
    <tr><td style="padding:10px 24px; font-size:13px; color:${MUTED}; font-family:${BODY_FONT};">Balance (due at fitting)</td><td align="right" style="padding:10px 24px; font-size:13px; font-family:${BODY_FONT};">${kes(order.balanceDue)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:32px 40px 44px; text-align:center;">
  <a href="${SITE_URL}/portal/orders" style="display:inline-block; padding:13px 28px; font-family:${BODY_FONT}; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; background:${OXBLOOD}; color:${CREAM}; text-decoration:none;">View in Your Record</a>
  ${atelier ? `<p style="margin:18px 0 0;"><a href="${SITE_URL}/booking?type=made-to-measure&ref=custom-suit-measuring" style="font-family:${BODY_FONT}; font-size:13px; color:${INK};">Book your measuring appointment →</a></p>` : ""}
</td></tr>
<tr><td style="background:${INK}; padding:28px 40px; text-align:center;">
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0 0 4px;">Ridgeways, Nairobi &middot; +254 705 706 433</p>
  <p style="font-family:${BODY_FONT}; font-size:11px; color:rgba(245,244,239,0.5); margin:0;">Sent because you placed an order on ashok.navac.co.ke.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}
