/** Fabric library swatches. Field names mirror the eventual `fabrics` Firestore collection. */

export interface Fabric {
  id: string;
  name: string;
  origin: string;
  weight: string;
  imageLabel: string;
  /** Path under /public once real photography exists for this slot; falls back to the labelled placeholder until then. */
  image?: string;
}

export const fabrics: Fabric[] = [
  {
    id: "fab-charcoal-wool",
    name: "Charcoal wool",
    origin: "Italy",
    weight: "Super 120s, 280g/m²",
    imageLabel: "IMG-20 · swatch, charcoal wool",
    image: "/photos/fabrics/charcoal-wool.jpg",
  },
  {
    id: "fab-mid-blue-twill",
    name: "Mid-blue twill",
    origin: "England",
    weight: "260g/m²",
    imageLabel: "IMG-21 · swatch, mid-blue twill",
    image: "/photos/fabrics/mid-blue-twill.jpg",
  },
  {
    id: "fab-houndstooth",
    name: "Houndstooth",
    origin: "England",
    weight: "300g/m²",
    imageLabel: "IMG-22 · swatch, houndstooth",
    image: "/photos/fabrics/houndstooth.jpg",
  },
  {
    id: "fab-ink-flannel",
    name: "Ink flannel",
    origin: "Italy",
    weight: "Super 100s, 320g/m²",
    imageLabel: "IMG-23 · swatch, ink flannel",
  },
  {
    id: "fab-oatmeal-linen",
    name: "Oatmeal linen",
    origin: "Ireland",
    weight: "220g/m²",
    imageLabel: "IMG-24 · swatch, oatmeal linen",
  },
  {
    id: "fab-navy-birdseye",
    name: "Navy birdseye",
    origin: "Italy",
    weight: "Super 130s, 250g/m²",
    imageLabel: "IMG-25 · swatch, navy birdseye",
  },
  {
    id: "fab-olive-corduroy",
    name: "Olive corduroy",
    origin: "Japan",
    weight: "340g/m²",
    imageLabel: "IMG-26 · swatch, olive corduroy",
  },
  {
    id: "fab-cream-linen-cotton",
    name: "Cream linen-cotton",
    origin: "Portugal",
    weight: "210g/m²",
    imageLabel: "IMG-27 · swatch, cream linen-cotton",
  },
];
