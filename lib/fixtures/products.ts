/** Shop items. Field names mirror the eventual `products` Firestore collection. */

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: "Shoes" | "Ties" | "Cufflinks";
  price: number;
  currency: "KES";
  sizes: string[];
  description: string;
  imageLabel: string;
  /** Path under /public once real photography exists for this slot; falls back to the labelled placeholder until then. */
  image?: string;
}

export const products: Product[] = [
  {
    id: "prod-derby-shoes",
    slug: "derby-shoes",
    name: "Derby Shoes",
    category: "Shoes",
    price: 24500,
    currency: "KES",
    sizes: ["40", "41", "42", "43", "44", "45"],
    description: "Black calf leather derby, hand-welted, sits well under a full suit.",
    imageLabel: "IMG-11 · derby shoes, black calf",
    image: "/photos/products/derby-shoes.jpg",
  },
  {
    id: "prod-silk-tie-oxblood",
    slug: "silk-tie-oxblood",
    name: "Silk Tie — Oxblood",
    category: "Ties",
    price: 5800,
    currency: "KES",
    sizes: ["One Size"],
    description: "Woven silk in oxblood, cut narrow to sit close under a two-button jacket.",
    imageLabel: "IMG-12 · silk tie, oxblood",
    image: "/photos/products/silk-tie-oxblood.jpg",
  },
  {
    id: "prod-cufflinks-brass",
    slug: "cufflinks-brass",
    name: "Cufflinks — Brass",
    category: "Cufflinks",
    price: 3200,
    currency: "KES",
    sizes: ["One Size"],
    description: "Solid brass, weighted, a plain face that doesn't compete with a cuff.",
    imageLabel: "IMG-13 · cufflinks, brass",
    image: "/photos/products/cufflinks-brass.jpg",
  },
  {
    id: "prod-oxford-shoes-black-calf",
    slug: "oxford-shoes-black-calf",
    name: "Oxford Shoes — Black Calf",
    category: "Shoes",
    price: 27500,
    currency: "KES",
    sizes: ["40", "41", "42", "43", "44", "45"],
    description: "Closed-lacing oxford in black calf, built for the formal end of the wardrobe.",
    imageLabel: "IMG-14 · oxford shoes, black calf",
    image: "/photos/products/oxford-shoes-black-calf.jpg",
  },
];
