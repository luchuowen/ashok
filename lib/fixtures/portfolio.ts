/** Portfolio gallery items. Field names mirror the eventual `portfolio` Firestore collection. */

export interface PortfolioItem {
  id: string;
  title: string;
  tag: "Bespoke Suit" | "Made-to-Measure" | "Wedding" | "Corporate";
  imageLabel: string;
  /** Path under /public once real photography exists for this slot; falls back to the labelled placeholder until then. */
  image?: string;
}

export const portfolioItems: PortfolioItem[] = [
  {
    id: "port-charcoal-three-piece",
    title: "Charcoal three-piece",
    tag: "Bespoke Suit",
    imageLabel: "IMG-30 · charcoal three-piece suit",
    image: "/photos/portfolio/charcoal-three-piece.jpg",
  },
  {
    id: "port-wedding-ivory-jacket",
    title: "Ivory dinner jacket",
    tag: "Wedding",
    imageLabel: "IMG-31 · ivory dinner jacket, groom",
    image: "/photos/portfolio/ivory-dinner-jacket.jpg",
  },
  {
    id: "port-navy-blazer-mtm",
    title: "Navy blazer",
    tag: "Made-to-Measure",
    imageLabel: "IMG-32 · navy blazer, made-to-measure",
    image: "/photos/portfolio/navy-blazer-mtm.jpg",
  },
  {
    id: "port-corporate-uniform-set",
    title: "Corporate uniform set",
    tag: "Corporate",
    imageLabel: "IMG-33 · corporate uniform set, five staff",
    image: "/photos/portfolio/corporate-uniform-set.jpg",
  },
];
