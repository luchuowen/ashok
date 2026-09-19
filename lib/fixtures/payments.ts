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

export const payments: Payment[] = [
  {
    id: "pay-001",
    clientId: "client-wanjiru-kamau",
    clientName: "Wanjiru Kamau",
    orderId: "order-charcoal-bespoke-suit",
    amount: 87000,
    currency: "KES",
    method: "M-Pesa",
    date: "2026-07-14",
    status: "Paid",
  },
  {
    id: "pay-002",
    clientId: "client-wanjiru-kamau",
    clientName: "Wanjiru Kamau",
    orderId: "order-charcoal-bespoke-suit",
    amount: 58000,
    currency: "KES",
    method: "M-Pesa",
    date: "2026-09-30",
    status: "Outstanding",
  },
];
