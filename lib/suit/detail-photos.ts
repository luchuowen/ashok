import type { SuitConfig } from "./types";

/**
 * Which close-up photograph shows a detail option. The stage's Detail view
 * switches to it when that option is changed, so every choice visibly changes
 * the preview. Returns null for options the full photos already show.
 */
export function detailPhotoFor(groupId: string | null, config: SuitConfig): string | null {
  if (!groupId) return null;
  const o = config.options;
  const lapelW = o["jacket.lapelWidth"] ?? "standard";
  const lapel = o["jacket.lapelFacing"] === "satin" ? "detail-lapel-satin" : `detail-lapel-${lapelW}`;
  const n = o["jacket.sleeveButtons"] ?? "4";
  const cuff = n === "0" ? "detail-cuff-0" : `detail-cuff-${n}-${o["jacket.cuffs"] === "working" ? "work" : "dec"}`;
  const waist = `detail-waist-${o["trousers.waist"] ?? "loops"}`;
  switch (groupId) {
    case "jacket.lapelWidth":
    case "jacket.lapelFacing":
      return lapel;
    case "accents.pickStitch":
      return `detail-pick-${o["accents.pickStitch"] === "yes" ? "yes" : "none"}`;
    case "jacket.shoulder":
      return `detail-shoulder-${o["jacket.shoulder"] ?? "natural"}`;
    case "jacket.pocketSlant":
    case "jacket.ticketPocket":
      return `detail-pocket-${o["jacket.pocketSlant"] ?? "straight"}-${o["jacket.ticketPocket"] === "ticket" ? "ticket" : "none"}`;
    case "jacket.breastPocket":
      return `detail-breast-${o["jacket.breastPocket"] ?? "welt"}`;
    case "jacket.sleeveButtons":
    case "jacket.cuffs":
      return cuff;
    case "trousers.waist":
      return waist;
    case "trousers.fastening":
      return o["trousers.fastening"] && o["trousers.fastening"] !== "centred" ? `detail-fastening-${o["trousers.fastening"]}` : waist;
    case "trousers.braces":
      return o["trousers.braces"] === "yes" ? "detail-braces-yes" : waist;
    case "trousers.pleats":
      return `detail-pleats-${o["trousers.pleats"] ?? "none"}`;
    case "trousers.sidePockets":
      return `detail-side-${o["trousers.sidePockets"] ?? "slanted"}`;
    case "trousers.backPockets":
      return `detail-back-${o["trousers.backPockets"] ?? "jetted1"}`;
    case "trousers.hem":
      return `detail-hem-${o["trousers.hem"] ?? "plain"}`;
    case "trousers.break":
      return `detail-break-${o["trousers.break"] ?? "half"}`;
    default:
      return null;
  }
}

/** Waistcoat photo for the most recently changed waistcoat option. */
export function waistcoatPhotoFor(groupId: string | null, config: SuitConfig): string | null {
  const o = config.options;
  const style = o["waistcoat.style"] ?? "sb5";
  if (groupId === "waistcoat.back") return `wc-back-${o["waistcoat.back"] ?? "lining"}`;
  if (groupId === "waistcoat.lapel" && o["waistcoat.lapel"] && o["waistcoat.lapel"] !== "none") return `wc-${o["waistcoat.lapel"]}`;
  if (groupId === "waistcoat.edge" && o["waistcoat.edge"] === "straight") return "wc-straight";
  if (groupId === "waistcoat.pockets" && o["waistcoat.pockets"] && o["waistcoat.pockets"] !== "welt") return o["waistcoat.pockets"] === "none" ? "wc-nopockets" : "wc-jetted";
  if (style === "sb6") return "wc-sb6";
  if (style === "db6") return "wc-db6";
  if (o["waistcoat.lapel"] && o["waistcoat.lapel"] !== "none") return `wc-${o["waistcoat.lapel"]}`;
  if (o["waistcoat.edge"] === "straight") return "wc-straight";
  return null; // waistcoat-sb5
}

/** Nearest stand-in while a close-up has not been photographed yet. */
export const DETAIL_FALLBACK: Record<string, string> = {
  "detail-cuff-3-dec": "detail-cuff-3-work",
  "detail-cuff-4-work": "detail-cuff-4-dec",
  "detail-hem-turnups": "detail-break-half",
  "detail-break-none": "detail-hem-plain",
  "detail-break-full": "detail-break-half",
  "wc-nopockets": "wc-jetted",
};
