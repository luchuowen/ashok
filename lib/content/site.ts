/**
 * Business constants for Ashok Sunny Tailored. Import from here rather than
 * re-typing contact details or copy inline.
 */

export const siteConfig = {
  name: "Ashok Sunny",
  fullName: "Ashok Sunny Tailored",
  address: "Ridgeways, Nairobi",
  phone: "+254 705 706 433",
  email: "ashoksunnytailored@gmail.com",
};

/** WhatsApp number in wa.me format (no spaces or plus sign). */
const whatsappNumber = siteConfig.phone.replace(/[^\d]/g, "");

export function waLink(message?: string): string {
  const base = `https://wa.me/${whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const whatsappHref = waLink();
