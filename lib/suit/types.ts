/**
 * Custom suit engine — shared types. Client-safe: nothing under lib/suit/
 * may import firebase-admin (the configurator runs in the browser and the
 * exact same modules re-price every order on the server).
 */

export type FabricCollection = "house" | "classic" | "premium" | "luxury" | "seasonal";

export type FabricPattern =
  | "solid"
  | "twill"
  | "melange"
  | "birdseye"
  | "herringbone"
  | "houndstooth"
  | "pinstripe"
  | "chalkstripe"
  | "glencheck"
  | "windowpane"
  | "corduroy"
  | "flannel"
  | "linen"
  | "donegal"
  | "velvet";

export type Season = "year-round" | "summer" | "winter";
export type Occasion = "business" | "wedding" | "celebration" | "smart-casual";

export interface SuitFabric {
  id: string;
  name: string;
  collection: FabricCollection;
  /** Two-piece suit price in KES (jacket + trousers, standard make). */
  price: number;
  composition: string;
  origin: string;
  weightGsm: number;
  /** Super number for worsted wools, where it applies. */
  superNumber?: number;
  pattern: FabricPattern;
  /** Base cloth colour. */
  hex: string;
  /** Secondary colour for patterned cloths (stripe, check, fleck). */
  accentHex?: string;
  colourName: string;
  colourFamily: "navy" | "blue" | "grey" | "charcoal" | "black" | "brown" | "beige" | "green" | "red" | "cream";
  season: Season;
  occasions: Occasion[];
  features: string[];
  stretch: boolean;
  description: string;
  /** Real swatch photography under /public, where it exists. */
  image?: string;
  badge?: "New" | "Best-seller" | "House pick";
  /** Set false to retire a cloth without deleting it (old orders keep resolving). */
  available: boolean;
}

export interface PaletteColour {
  id: string;
  name: string;
  hex: string;
  /** Secondary colour for prints. */
  accentHex?: string;
  kind?: "solid" | "paisley" | "kitenge" | "geometric" | "stripe";
  /** KES surcharge where the colour itself costs extra (prints). */
  price?: number;
}

export interface OptionValue {
  id: string;
  label: string;
  description?: string;
  /** Flat KES surcharge per suit. */
  price?: number;
  /** Glyph key for the option tile (components/suit/OptionGlyph.tsx). */
  glyph?: string;
  /** Swatch colour for colour-type options. */
  hex?: string;
}

export type OptionSection = "suit" | "jacket" | "trousers" | "waistcoat" | "accents";

export interface OptionGroup {
  id: string;
  section: OptionSection;
  label: string;
  help?: string;
  values: OptionValue[];
  defaultValue: string;
  /** Tile layout: "glyph" tiles with drawings, "chip" compact text pills, "swatch" colour dots. */
  display: "glyph" | "chip" | "swatch";
  /** Shown only in the advanced view (Hockerty-style "too many options?"). */
  advanced?: boolean;
}

export interface MonogramSpec {
  text: string;
  font: "script" | "serif" | "block";
  thread: string;
  placement: "lining" | "collar" | "cuff";
}

export interface SuitConfig {
  v: 1;
  /** Jacket fabric — and every piece when fabricMode is "same". */
  fabric: string;
  trouserFabric: string | null;
  waistcoatFabric: string | null;
  options: Record<string, string>;
  lining: string;
  thread: string;
  monogram: MonogramSpec | null;
  notes: string;
}

export interface PriceLine {
  label: string;
  amount: number;
}

export interface SuitPrice {
  lines: PriceLine[];
  unitTotal: number;
}

export interface SpecGroup {
  title: string;
  rows: { label: string; value: string }[];
}

export type Adjustment = { groupId: string; from: string; to: string; message: string };

/* ---------------- Fit profile ---------------- */

export type MeasureKey =
  | "neck"
  | "chest"
  | "stomach"
  | "hips"
  | "shoulder"
  | "sleeve"
  | "bicep"
  | "wrist"
  | "jacketLength"
  | "trouserWaist"
  | "thigh"
  | "rise"
  | "inseam";

export type FitMethod = "estimate" | "self" | "onfile" | "atelier";

export interface BodyBasics {
  height: number; // cm
  weight: number; // kg
  age: number;
}

export interface BuildProfile {
  shoulders: "sloping" | "average" | "square";
  posture: "upright" | "average" | "forward";
  stomach: "flat" | "average" | "rounded";
  seat: "flat" | "average" | "prominent";
}

export interface FitProfile {
  v: 1;
  name: string;
  method: FitMethod;
  units: "cm" | "in";
  basics: BodyBasics | null;
  /** Always stored in centimetres regardless of display units. */
  body: Partial<Record<MeasureKey, number>>;
  build: BuildProfile;
  /** Staff measurement record this was taken from (method "onfile"). */
  onFileId?: string;
  onFileTakenAt?: string;
  updatedAt: string;
}
