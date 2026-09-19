/** Client orders in progress. Field names mirror the eventual `orders` Firestore collection. */

export type OrderStage =
  | "Consultation"
  | "Measurements Taken"
  | "Cutting"
  | "First Fitting"
  | "Final Fitting"
  | "Ready for Collection"
  | "Collected";

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  item: string;
  stage: OrderStage;
  statusNote: string;
  startedAt: string; // ISO date
  estimatedCompletion: string; // ISO date
  price: number;
  currency: "KES";
  balanceDue: number;
}

export const orders: Order[] = [
  {
    id: "order-charcoal-bespoke-suit",
    clientId: "client-wanjiru-kamau",
    clientName: "Wanjiru Kamau",
    item: "Charcoal Bespoke Suit",
    stage: "First Fitting",
    statusNote: "First Fitting done",
    startedAt: "2026-07-14",
    estimatedCompletion: "2026-09-30",
    price: 145000,
    currency: "KES",
    balanceDue: 58000,
  },
];
