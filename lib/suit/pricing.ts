import {
  COLLECTION_LABELS,
  DELIVERY_METHODS,
  DEPOSIT_RATE,
  LEAD_TIME_DAYS,
  LINING_COLOURS,
  OPTION_GROUPS,
  PIECE_SHARE,
  getFabric,
  type DeliveryMethodId,
} from "./catalogue";
import { isGroupApplicable } from "./rules";
import type { PriceLine, SuitConfig, SuitPrice } from "./types";

const round100 = (n: number) => Math.round(n / 100) * 100;

export function pieceCost(fabricId: string, piece: "jacket" | "trousers" | "waistcoat"): number {
  const fabric = getFabric(fabricId);
  if (!fabric) return 0;
  if (piece === "jacket") return round100(fabric.price * PIECE_SHARE.jacket);
  if (piece === "trousers") return fabric.price - round100(fabric.price * PIECE_SHARE.jacket);
  return round100(fabric.price * PIECE_SHARE.waistcoat);
}

/**
 * Price one suit from a (normalised) config. Pure and deterministic — the
 * browser calls it for the live price, the checkout API calls it again on
 * the server with the same catalogue, and only the server's number is ever
 * charged.
 */
export function priceSuit(c: SuitConfig): SuitPrice {
  const lines: PriceLine[] = [];
  const jacketFabric = getFabric(c.fabric);
  const trouserFabricId = c.trouserFabric ?? c.fabric;
  const waistcoatFabricId = c.waistcoatFabric ?? c.fabric;
  const three = c.options["suit.pieces"] === "three";

  if (!c.trouserFabric || c.trouserFabric === c.fabric) {
    lines.push({
      label: `Two-piece suit · ${jacketFabric?.name ?? "fabric"} (${COLLECTION_LABELS[jacketFabric?.collection ?? "house"]})`,
      amount: jacketFabric?.price ?? 0,
    });
  } else {
    lines.push({ label: `Jacket · ${jacketFabric?.name}`, amount: pieceCost(c.fabric, "jacket") });
    lines.push({ label: `Trousers · ${getFabric(trouserFabricId)?.name}`, amount: pieceCost(trouserFabricId, "trousers") });
  }
  if (three) {
    lines.push({ label: `Waistcoat · ${getFabric(waistcoatFabricId)?.name}`, amount: pieceCost(waistcoatFabricId, "waistcoat") });
  }
  if (c.options["suit.extraTrousers"] === "one") {
    lines.push({ label: "Second pair of trousers", amount: pieceCost(trouserFabricId, "trousers") });
  }

  for (const group of OPTION_GROUPS) {
    if (!isGroupApplicable(group.id, c)) continue;
    if (group.id === "suit.extraTrousers") continue;
    const value = group.values.find((v) => v.id === c.options[group.id]);
    if (!value?.price) continue;
    lines.push({ label: `${group.label}: ${value.label}`, amount: value.price });
  }

  if (isGroupApplicable("accents.liningColour", c) && c.options["accents.liningColour"] === "custom") {
    const lining = LINING_COLOURS.find((l) => l.id === c.lining);
    if (lining?.price) lines.push({ label: `Print lining: ${lining.name}`, amount: lining.price });
  }

  const unitTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, unitTotal };
}

export function deliveryFee(method: string): number | null {
  const m = DELIVERY_METHODS.find((d) => d.id === method);
  return m ? m.fee : null;
}

export function isDeliveryMethod(v: unknown): v is DeliveryMethodId {
  return typeof v === "string" && DELIVERY_METHODS.some((d) => d.id === v);
}

export function depositFor(total: number): number {
  return Math.ceil((total * DEPOSIT_RATE) / 100) * 100;
}

/** Working-day-agnostic estimate; staff refine it once measurements land. */
export function leadTimeDays(c: SuitConfig): number {
  return c.options["suit.service"] === "priority" ? LEAD_TIME_DAYS.priority : LEAD_TIME_DAYS.standard;
}

export function suitTitle(c: SuitConfig): string {
  const three = c.options["suit.pieces"] === "three";
  const closure = c.options["jacket.closure"];
  const style =
    closure === "mandarin"
      ? "Mandarin"
      : closure?.startsWith("db")
        ? "Double-Breasted"
        : c.options["jacket.lapel"] === "shawl" && c.options["jacket.lapelFacing"] === "satin"
          ? "Dinner"
          : "";
  return ["Custom", style, three ? "Three-Piece" : "Two-Piece", "Suit"].filter(Boolean).join(" ");
}
