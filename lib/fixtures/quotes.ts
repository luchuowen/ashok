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

export const quotes: Quote[] = [];
