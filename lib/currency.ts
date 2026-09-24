/**
 * Display currency. Every price in the system is authored, stored and
 * charged in KES (TaifaPay invoices are KES-only). USD is a display
 * conversion for visitors abroad, clearly labelled as approximate.
 * Update KES_PER_USD via NEXT_PUBLIC_KES_PER_USD without a code change.
 */
export type DisplayCurrency = "KES" | "USD";

const envRate = Number(process.env.NEXT_PUBLIC_KES_PER_USD);
export const KES_PER_USD = Number.isFinite(envRate) && envRate > 50 ? envRate : 129;

export const CURRENCY_STORAGE_KEY = "ashok-currency";

export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

export function formatUsd(amountKes: number): string {
  const usd = amountKes / KES_PER_USD;
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}

export function formatMoney(amountKes: number, currency: DisplayCurrency): string {
  return currency === "USD" ? formatUsd(amountKes) : formatKes(amountKes);
}
