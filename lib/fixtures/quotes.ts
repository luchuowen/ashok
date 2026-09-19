/** Client quotes awaiting approval. Field names mirror the eventual `quotes` Firestore collection. */

export type QuoteStatus = "Pending" | "Approved" | "Expired";

export interface Quote {
  id: string;
  clientId: string;
  clientName: string;
  item: string;
  amount: number;
  currency: "KES";
  status: QuoteStatus;
  issuedAt: string; // ISO date
  expiresAt: string; // ISO date
}

export const quotes: Quote[] = [
  {
    id: "quote-navy-blazer-mtm",
    clientId: "client-wanjiru-kamau",
    clientName: "Wanjiru Kamau",
    item: "Made-to-Measure Navy Blazer",
    amount: 62000,
    currency: "KES",
    status: "Pending",
    issuedAt: "2026-09-02",
    expiresAt: "2026-09-30",
  },
];
