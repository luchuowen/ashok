/** Client payment ledger. Field names mirror the eventual `payments` Firestore collection. */

export type PaymentStatus = "Paid" | "Outstanding";

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  orderId: string;
  amount: number;
  currency: "KES";
  method: "M-Pesa" | "Card" | "Bank Transfer" | "Cash";
  date: string; // ISO date
  status: PaymentStatus;
}

export const payments: Payment[] = [];
