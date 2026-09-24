import {
  FABRIC_BY_ID,
  GROUP_BY_ID,
  LINING_COLOURS,
  OPTION_GROUPS,
  THREAD_COLOURS,
  defaultConfig,
} from "./catalogue";
import type { Adjustment, MonogramSpec, OptionGroup, SuitConfig } from "./types";

/**
 * Dependency rules between options. Two kinds:
 *  - applicability: a whole group doesn't apply (waistcoat options on a
 *    two-piece, lapel width on a mandarin collar). Hidden in the UI and
 *    normalised back to the default so stored configs stay clean.
 *  - value restrictions: a specific value isn't allowed in combination
 *    with something else. Shown disabled with the reason.
 * normalizeConfig() applies both and reports what it had to change, so the
 * UI can tell the customer ("Lapel changed to Peak because…").
 */

export function isGroupApplicable(groupId: string, c: SuitConfig): boolean {
  const o = c.options;
  const three = o["suit.pieces"] === "three";
  switch (groupId) {
    case "jacket.lapel":
    case "jacket.lapelWidth":
      return o["jacket.closure"] !== "mandarin";
    case "jacket.pocketSlant":
      return o["jacket.pockets"] === "flap" || o["jacket.pockets"] === "jetted";
    case "jacket.ticketPocket":
      return o["jacket.pockets"] !== "none";
    case "accents.liningColour":
      return o["accents.liningStyle"] !== "unlined";
    default:
      if (groupId.startsWith("waistcoat.")) return three;
      return true;
  }
}

/** Reason a value can't be chosen right now, or null if it's allowed. */
export function disabledReason(groupId: string, valueId: string, c: SuitConfig): string | null {
  const o = c.options;
  switch (groupId) {
    case "suit.pieces":
      if (valueId === "three" && o["jacket.closure"] === "mandarin") {
        return "A mandarin jacket isn't made with a waistcoat — choose another jacket style first.";
      }
      return null;
    case "jacket.closure":
      if (valueId === "mandarin" && o["suit.pieces"] === "three") {
        return "Mandarin jackets are two-piece only.";
      }
      if ((valueId === "sb3" || valueId === "db4" || valueId === "db6") && o["jacket.lapel"] === "shawl") {
        return "A shawl collar is cut for a one- or two-button front.";
      }
      return null;
    case "jacket.lapel":
      if (valueId === "shawl" && !["sb1", "sb2"].includes(o["jacket.closure"] ?? "")) {
        return "Shawl collars only suit a one- or two-button single-breasted jacket.";
      }
      return null;
    case "jacket.pocketSlant":
      return null;
    case "waistcoat.lapel":
      if (valueId === "notch" && o["waistcoat.style"] === "db6") {
        return "Double-breasted waistcoats take a peak or shawl lapel, or none.";
      }
      return null;
    case "accents.buttonholes":
      if (valueId === "lapel" && o["jacket.closure"] === "mandarin") {
        return "A mandarin collar has no lapel buttonhole.";
      }
      if (valueId === "cuffs" && o["jacket.sleeveButtons"] === "0") {
        return "There are no cuff buttonholes without sleeve buttons.";
      }
      return null;
    case "accents.pocketSquare":
      if (valueId !== "none" && o["jacket.breastPocket"] === "none") {
        return "A pocket square needs a breast pocket.";
      }
      return null;
    case "accents.belt":
      if (valueId !== "none" && o["trousers.waist"] !== "loops") {
        return "A belt needs belt loops — choose Belt loops under Trousers → Waist.";
      }
      return null;
    case "accents.braces":
      if (valueId !== "none" && o["trousers.waist"] === "active") {
        return "An elastic active waist doesn't take braces.";
      }
      return null;
    case "jacket.cuffs":
      if (valueId === "working" && o["jacket.sleeveButtons"] === "0") {
        return "Working cuffs need sleeve buttons.";
      }
      return null;
    case "trousers.braces":
      if (valueId === "yes" && o["trousers.waist"] === "active") {
        return "An elastic active waist doesn't take braces.";
      }
      return null;
    default:
      return null;
  }
}

function preferredFallback(group: OptionGroup, c: SuitConfig, current: string): string {
  // Sensible targets for the common forced changes, before falling back to
  // the first allowed value.
  const candidates: string[] = [];
  if (group.id === "jacket.lapel") candidates.push(c.options["jacket.closure"]?.startsWith("db") ? "peak" : "notch");
  if (group.id === "jacket.closure") candidates.push("sb2");
  if (group.id === "suit.pieces") candidates.push("two");
  if (group.id === "waistcoat.lapel") candidates.push("peak", "none");
  candidates.push(group.defaultValue, ...group.values.map((v) => v.id));
  return candidates.find((id) => id !== current && !disabledReason(group.id, id, c)) ?? group.defaultValue;
}

/**
 * Make any config valid: fill missing/unknown values, reset groups that
 * don't apply, resolve disallowed combinations, repair palette picks.
 * `changedGroup` (the option the customer just touched) is kept as chosen
 * wherever possible — the *other* option gives way.
 */
export function normalizeConfig(
  input: SuitConfig,
  changedGroup?: string,
): { config: SuitConfig; adjustments: Adjustment[] } {
  const base = defaultConfig();
  // Rebuild from known fields only — nothing unexpected from a client payload
  // is ever carried into a stored order.
  const c: SuitConfig = {
    v: 1,
    fabric: typeof input?.fabric === "string" ? input.fabric : base.fabric,
    trouserFabric: typeof input?.trouserFabric === "string" ? input.trouserFabric : null,
    waistcoatFabric: typeof input?.waistcoatFabric === "string" ? input.waistcoatFabric : null,
    options: { ...base.options, ...(input?.options && typeof input.options === "object" ? input.options : {}) },
    lining: typeof input?.lining === "string" ? input.lining : base.lining,
    thread: typeof input?.thread === "string" ? input.thread : base.thread,
    monogram: input?.monogram ?? null,
    notes: typeof input?.notes === "string" ? input.notes : "",
  };
  const adjustments: Adjustment[] = [];

  // Unknown ids (renamed options, tampered input) → defaults.
  for (const group of OPTION_GROUPS) {
    const value = c.options[group.id];
    if (!group.values.some((v) => v.id === value)) c.options[group.id] = group.defaultValue;
  }
  // Drop keys that aren't groups at all.
  for (const key of Object.keys(c.options)) {
    if (!GROUP_BY_ID[key]) delete c.options[key];
  }

  // Resolve conflicts. Process the changed group first so it "wins".
  const order = [...OPTION_GROUPS].sort((a, b) =>
    a.id === changedGroup ? -1 : b.id === changedGroup ? 1 : 0,
  );
  for (let pass = 0; pass < 4; pass++) {
    // Pass 0 skips the group just changed (so the others give way); always
    // run at least one more pass so that group is itself validated too.
    let changed = pass === 0 && Boolean(changedGroup);
    for (const group of order) {
      if (group.id === changedGroup && pass === 0) continue;
      const value = c.options[group.id]!;
      if (!isGroupApplicable(group.id, c)) {
        if (value !== group.defaultValue) {
          c.options[group.id] = group.defaultValue;
          changed = true;
        }
        continue;
      }
      const reason = disabledReason(group.id, value, c);
      if (reason) {
        const next = preferredFallback(group, c, value);
        const fromLabel = group.values.find((v) => v.id === value)?.label ?? value;
        const toLabel = group.values.find((v) => v.id === next)?.label ?? next;
        c.options[group.id] = next;
        adjustments.push({
          groupId: group.id,
          from: value,
          to: next,
          message: `${group.label} changed from ${fromLabel} to ${toLabel}. ${reason}`,
        });
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Tie or bow tie, never both: the one just chosen wins (tie otherwise).
  if (c.options["accents.necktie"] !== "none" && c.options["accents.bowtie"] !== "none") {
    const keepBow = changedGroup === "accents.bowtie";
    const drop = keepBow ? "accents.necktie" : "accents.bowtie";
    adjustments.push({
      groupId: drop,
      from: c.options[drop]!,
      to: "none",
      message: keepBow ? "Necktie removed — you've chosen a bow tie." : "Bow tie removed — you've chosen a necktie.",
    });
    c.options[drop] = "none";
  }
  // Braces are button-on: they bring braces buttons with them.
  if (c.options["accents.braces"] !== "none" && c.options["trousers.braces"] !== "yes") {
    if (changedGroup === "trousers.braces") {
      adjustments.push({ groupId: "accents.braces", from: c.options["accents.braces"]!, to: "none", message: "Braces removed — they need braces buttons." });
      c.options["accents.braces"] = "none";
    } else if (!disabledReason("trousers.braces", "yes", c)) {
      adjustments.push({ groupId: "trousers.braces", from: c.options["trousers.braces"]!, to: "yes", message: "Braces buttons added to the trousers for your braces." });
      c.options["trousers.braces"] = "yes";
    }
  }

  // Fabrics.
  if (!FABRIC_BY_ID[c.fabric]?.available) c.fabric = base.fabric;
  const mixed = c.options["suit.fabricMode"] === "mixed";
  const three = c.options["suit.pieces"] === "three";
  if (!mixed) {
    c.trouserFabric = null;
    c.waistcoatFabric = null;
  } else {
    if (!c.trouserFabric || !FABRIC_BY_ID[c.trouserFabric]?.available) c.trouserFabric = c.fabric;
    if (!three) c.waistcoatFabric = null;
    else if (!c.waistcoatFabric || !FABRIC_BY_ID[c.waistcoatFabric]?.available) c.waistcoatFabric = c.fabric;
  }

  if (!LINING_COLOURS.some((l) => l.id === c.lining)) c.lining = base.lining;
  if (!THREAD_COLOURS.some((t) => t.id === c.thread)) c.thread = base.thread;

  if (c.options["accents.monogram"] === "yes") {
    c.monogram = sanitizeMonogram(c.monogram);
  } else {
    c.monogram = null;
  }
  c.notes = typeof c.notes === "string" ? c.notes.slice(0, NOTES_MAX) : "";
  c.v = 1;
  return { config: c, adjustments };
}

export const NOTES_MAX = 500;
export const MONOGRAM_PATTERN = /^[A-Z&.]{1,4}$/;

export function sanitizeMonogram(m: Partial<MonogramSpec> | null | undefined): MonogramSpec {
  const text = String(m?.text ?? "")
    .toUpperCase()
    .replace(/[^A-Z&.]/g, "")
    .slice(0, 4);
  const font = m?.font === "serif" || m?.font === "block" ? m.font : "script";
  const thread = THREAD_COLOURS.some((t) => t.id === m?.thread) ? (m!.thread as string) : "cream";
  const placement = m?.placement === "collar" || m?.placement === "cuff" ? m.placement : "lining";
  return { text, font, thread, placement };
}

/**
 * Strict server-side check for checkout: anything normalizeConfig would have
 * to *change* means the client sent something the UI can't produce, so the
 * order is rejected rather than silently altered. Returns an error message
 * or null.
 */
export function validateConfigStrict(raw: unknown): { config: SuitConfig } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Suit design is missing." };
  const input = raw as SuitConfig;
  if (input.v !== 1) return { error: "This suit design is from an older version — please reopen it in the designer." };
  if (!FABRIC_BY_ID[input.fabric]) return { error: "That fabric no longer exists — please choose another." };
  if (!FABRIC_BY_ID[input.fabric]!.available) {
    return { error: `${FABRIC_BY_ID[input.fabric]!.name} is no longer available — please choose another fabric.` };
  }
  for (const f of [input.trouserFabric, input.waistcoatFabric]) {
    if (f && !FABRIC_BY_ID[f]?.available) return { error: "One of your fabrics is no longer available — please reopen the design." };
  }
  if (!input.options || typeof input.options !== "object") return { error: "Suit design is incomplete." };
  for (const group of OPTION_GROUPS) {
    const v = input.options[group.id];
    if (v !== undefined && !group.values.some((x) => x.id === v)) {
      return { error: `"${group.label}" has an option that's no longer offered — please reopen the design.` };
    }
  }
  if (input.options["accents.monogram"] === "yes") {
    const text = input.monogram?.text ?? "";
    if (!MONOGRAM_PATTERN.test(text)) return { error: "Monogram initials must be 1–4 letters." };
  }
  if (typeof input.notes === "string" && input.notes.length > NOTES_MAX) {
    return { error: `Tailoring notes are limited to ${NOTES_MAX} characters.` };
  }
  const { config, adjustments } = normalizeConfig(input);
  if (adjustments.length > 0) return { error: adjustments[0]!.message };
  return { config };
}
