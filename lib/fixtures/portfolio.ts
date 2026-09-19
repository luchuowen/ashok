/** Portfolio gallery items. Field names mirror the eventual `portfolio` Firestore collection. */

export interface PortfolioItem {
  id: string;
  title: string;
  tag: "Bespoke Suit" | "Made-to-Measure" | "Wedding" | "Corporate";
  imageLabel: string;
}

export const portfolioItems: PortfolioItem[] = [
  {
    id: "port-charcoal-three-piece",
    title: "Charcoal three-piece",
    tag: "Bespoke Suit",
    imageLabel: "IMG-30 · charcoal three-piece suit",
  },
  {
    id: "port-wedding-ivory-jacket",
    title: "Ivory dinner jacket",
    tag: "Wedding",
    imageLabel: "IMG-31 · ivory dinner jacket, groom",
  },
  {
    id: "port-navy-blazer-mtm",
    title: "Navy blazer",
    tag: "Made-to-Measure",
    imageLabel: "IMG-32 · navy blazer, made-to-measure",
  },
  {
    id: "port-corporate-uniform-set",
    title: "Corporate uniform set",
    tag: "Corporate",
    imageLabel: "IMG-33 · corporate uniform set, five staff",
  },
];
