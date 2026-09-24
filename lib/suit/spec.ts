import {
  FELT_COLOURS,
  GROUP_BY_ID,
  LINING_COLOURS,
  MONOGRAM_FONTS,
  OPTION_GROUPS,
  THREAD_COLOURS,
  getFabric,
} from "./catalogue";
import { isGroupApplicable } from "./rules";
import type { OptionSection, SpecGroup, SuitConfig } from "./types";

function fabricLine(id: string | null | undefined): string {
  const f = getFabric(id);
  if (!f) return "—";
  return `${f.name} — ${f.composition}, ${f.weightGsm}g/m², ${f.origin}`;
}

const SECTION_TITLES: Record<OptionSection, string> = {
  suit: "Suit",
  jacket: "Jacket",
  trousers: "Trousers",
  waistcoat: "Waistcoat",
  accents: "Finishing",
};

/**
 * Full human-readable specification — what the customer reviews before
 * adding to bag, what the confirmation email lists, and what the cutting
 * room reads off the work ticket. Stored on the order as a snapshot so it
 * stays readable even if the catalogue later changes.
 */
export function buildSpec(c: SuitConfig): SpecGroup[] {
  const groups: SpecGroup[] = [];
  const mixed = c.options["suit.fabricMode"] === "mixed";
  const three = c.options["suit.pieces"] === "three";

  const fabricRows = [{ label: mixed ? "Jacket fabric" : "Fabric", value: fabricLine(c.fabric) }];
  if (mixed) {
    fabricRows.push({ label: "Trouser fabric", value: fabricLine(c.trouserFabric ?? c.fabric) });
    if (three) fabricRows.push({ label: "Waistcoat fabric", value: fabricLine(c.waistcoatFabric ?? c.fabric) });
  }
  groups.push({ title: "Fabric", rows: fabricRows });

  const sections: OptionSection[] = ["suit", "jacket", "trousers", "waistcoat", "accents"];
  for (const section of sections) {
    const rows: { label: string; value: string }[] = [];
    for (const group of OPTION_GROUPS) {
      if (group.section !== section) continue;
      if (group.id === "suit.fabricMode") continue;
      if (!isGroupApplicable(group.id, c)) continue;
      const value = group.values.find((v) => v.id === c.options[group.id]);
      if (!value) continue;
      let text = value.label;
      if (group.id === "accents.liningColour") {
        text = value.id === "custom" ? LINING_COLOURS.find((l) => l.id === c.lining)?.name ?? value.label : "Tone-matched (house)";
      }
      if (group.id === "accents.buttonholes" && value.id !== "matched") {
        text = `${value.label} — ${THREAD_COLOURS.find((t) => t.id === c.thread)?.name ?? ""}`;
      }
      if (group.id === "accents.monogram") {
        if (!c.monogram) continue;
        const font = MONOGRAM_FONTS.find((f) => f.id === c.monogram!.font)?.label;
        const thread = THREAD_COLOURS.find((t) => t.id === c.monogram!.thread)?.name;
        const place = { lining: "inside lining", collar: "under collar", cuff: "left cuff" }[c.monogram.placement];
        text = `"${c.monogram.text}" · ${font} · ${thread} thread · ${place}`;
      }
      if (group.id === "accents.underCollar" && value.id !== "matched") {
        text = `${FELT_COLOURS.find((f) => f.id === value.id)?.name} felt`;
      }
      rows.push({ label: group.label, value: text });
    }
    if (rows.length) groups.push({ title: SECTION_TITLES[section], rows });
  }

  if (c.notes.trim()) groups.push({ title: "Tailoring notes", rows: [{ label: "Notes", value: c.notes.trim() }] });
  return groups;
}

/** One-line summary for cart rows, TaifaPay descriptions and admin lists. */
export function specSummary(c: SuitConfig): string {
  const f = getFabric(c.fabric);
  const o = c.options;
  const bits = [
    f?.name,
    GROUP_BY_ID["jacket.closure"]?.values.find((v) => v.id === o["jacket.closure"])?.label,
    o["jacket.closure"] !== "mandarin" ? `${o["jacket.lapel"]} lapel` : null,
    o["suit.pieces"] === "three" ? "with waistcoat" : null,
  ];
  return bits.filter(Boolean).join(" · ");
}
