import type { BodyBasics, BuildProfile, FitMethod, FitProfile, MeasureKey } from "./types";

/**
 * Fit-profile fields, guides and validation. Every value is stored in cm;
 * inches are a display conversion only.
 */
export interface MeasureField {
  key: MeasureKey;
  label: string;
  group: "upper" | "lower";
  min: number;
  max: number;
  guide: string;
  /** Diagram hint used by components/suit/BodyDiagram.tsx. */
  zone: string;
}

export const MEASURE_FIELDS: MeasureField[] = [
  { key: "neck", label: "Neck", group: "upper", min: 30, max: 56, zone: "neck", guide: "Wrap the tape around the base of the neck where a shirt collar sits. Keep one finger under the tape." },
  { key: "chest", label: "Chest", group: "upper", min: 76, max: 160, zone: "chest", guide: "Under the arms, around the fullest part of the chest and shoulder blades. Arms relaxed, breathe normally." },
  { key: "stomach", label: "Stomach", group: "upper", min: 60, max: 170, zone: "stomach", guide: "Around the widest part of the stomach, usually at the navel. Stand naturally — don't hold it in." },
  { key: "shoulder", label: "Shoulder width", group: "upper", min: 36, max: 62, zone: "shoulder", guide: "Across the back, from the bony point of one shoulder to the other, following the curve." },
  { key: "sleeve", label: "Sleeve length", group: "upper", min: 50, max: 76, zone: "sleeve", guide: "From the shoulder point down the outside of a slightly bent arm to the wrist bone." },
  { key: "bicep", label: "Bicep", group: "upper", min: 22, max: 56, zone: "bicep", guide: "Around the fullest part of the upper arm, arm relaxed at your side." },
  { key: "wrist", label: "Wrist", group: "upper", min: 13, max: 26, zone: "wrist", guide: "Around the wrist just above the bone. Add nothing — we allow for a watch." },
  { key: "jacketLength", label: "Jacket length", group: "upper", min: 62, max: 92, zone: "jacketLength", guide: "From where the collar meets the shoulder at the back, straight down to where you want the jacket to end — usually mid-seat." },
  { key: "trouserWaist", label: "Trouser waist", group: "lower", min: 60, max: 160, zone: "trouserWaist", guide: "Where you wear your trousers — usually just below the navel. Snug, not tight." },
  { key: "hips", label: "Hips / seat", group: "lower", min: 76, max: 170, zone: "hips", guide: "Around the fullest part of the seat, feet together." },
  { key: "thigh", label: "Thigh", group: "lower", min: 40, max: 90, zone: "thigh", guide: "Around the fullest part of the thigh, just below the crotch." },
  { key: "rise", label: "Crotch rise", group: "lower", min: 52, max: 96, zone: "rise", guide: "From the front waistband, between the legs, up to the back waistband at the same height." },
  { key: "inseam", label: "Inseam", group: "lower", min: 60, max: 100, zone: "inseam", guide: "From the crotch seam down the inside leg to where the trouser should end, shoes on." },
];

export const FIELD_BY_KEY: Record<MeasureKey, MeasureField> = Object.fromEntries(
  MEASURE_FIELDS.map((f) => [f.key, f]),
) as Record<MeasureKey, MeasureField>;

export const BASICS_LIMITS = {
  height: { min: 140, max: 215 },
  weight: { min: 40, max: 200 },
  age: { min: 16, max: 90 },
} as const;

export const DEFAULT_BUILD: BuildProfile = {
  shoulders: "average",
  posture: "average",
  stomach: "average",
  seat: "average",
};

export const BUILD_QUESTIONS: {
  key: keyof BuildProfile;
  label: string;
  options: { id: string; label: string }[];
}[] = [
  { key: "shoulders", label: "Shoulders", options: [{ id: "sloping", label: "Sloping" }, { id: "average", label: "Average" }, { id: "square", label: "Square" }] },
  { key: "posture", label: "Posture", options: [{ id: "upright", label: "Upright" }, { id: "average", label: "Average" }, { id: "forward", label: "Leans forward" }] },
  { key: "stomach", label: "Stomach", options: [{ id: "flat", label: "Flat" }, { id: "average", label: "Average" }, { id: "rounded", label: "Rounded" }] },
  { key: "seat", label: "Seat", options: [{ id: "flat", label: "Flat" }, { id: "average", label: "Average" }, { id: "prominent", label: "Prominent" }] },
];

export const METHOD_LABELS: Record<FitMethod, string> = {
  estimate: "Estimated from height & weight, then reviewed",
  self: "Measured at home",
  onfile: "Measurements on file at the atelier",
  atelier: "Measured at the Ridgeways atelier",
};

const half = (n: number) => Math.round(n * 2) / 2;

/**
 * Starting-point estimate from height, weight and age — a regression-style
 * approximation (calibrated against typical adult proportions), refined by
 * the build answers. Always presented to the customer for review, and
 * confirmed at the first fitting regardless.
 */
export function estimateMeasurements(b: BodyBasics, build: BuildProfile = DEFAULT_BUILD): Record<MeasureKey, number> {
  const bmi = b.weight / (b.height / 100) ** 2;
  const d = bmi - 24;
  const h = b.height - 176;
  const ageAdj = Math.max(0, b.age - 30);
  const stomachAdj = build.stomach === "flat" ? -4 : build.stomach === "rounded" ? 5 : 0;
  const seatAdj = build.seat === "flat" ? -2 : build.seat === "prominent" ? 3 : 0;
  const shoulderAdj = build.shoulders === "square" ? 0.5 : build.shoulders === "sloping" ? -0.5 : 0;

  const stomach = 88 + d * 2.9 + ageAdj * 0.18 + h * 0.1 + stomachAdj;
  return {
    neck: half(39 + d * 0.6 + h * 0.03),
    chest: half(100 + d * 2.1 + h * 0.15),
    stomach: half(stomach),
    shoulder: half(46 + h * 0.12 + d * 0.75 + shoulderAdj),
    sleeve: half(63.5 + h * 0.33),
    bicep: half(32 + d * 0.8),
    wrist: half(17.5 + d * 0.25 + h * 0.03),
    jacketLength: half(76 + h * 0.4),
    trouserWaist: half(stomach * 0.96),
    hips: half(100 + d * 1.75 + h * 0.2 + seatAdj),
    thigh: half(57 + d * 1.15),
    rise: half(66 + d * 0.8 + h * 0.05),
    inseam: half(81 + h * 0.45),
  };
}

export function cmToIn(cm: number): number {
  return Math.round((cm / 2.54) * 4) / 4;
}
export function inToCm(inch: number): number {
  return Math.round(inch * 2.54 * 2) / 2;
}

export interface FitIssue {
  key?: MeasureKey | "height" | "weight" | "age" | "name";
  message: string;
  severity: "error" | "warning";
}

/**
 * Validate a fit profile. Errors block checkout; warnings ask the customer
 * to double-check a combination that's unusual (but can be right).
 */
export function validateFitProfile(p: FitProfile | null | undefined): FitIssue[] {
  const issues: FitIssue[] = [];
  if (!p) return [{ message: "Add your measurements, or choose to be measured at the atelier.", severity: "error" }];
  if (!["estimate", "self", "onfile", "atelier"].includes(p.method)) {
    return [{ message: "Choose how you'd like to be measured.", severity: "error" }];
  }
  if (p.method === "atelier") return issues;
  if (p.method === "onfile") {
    if (!p.onFileId) issues.push({ message: "We couldn't find measurements on file for you.", severity: "error" });
    return issues;
  }
  const b = p.basics;
  if (!b) {
    issues.push({ message: "Add your height, weight and age.", severity: "error" });
  } else {
    (Object.keys(BASICS_LIMITS) as (keyof typeof BASICS_LIMITS)[]).forEach((k) => {
      const v = b[k];
      const lim = BASICS_LIMITS[k];
      if (!Number.isFinite(v) || v < lim.min || v > lim.max) {
        issues.push({ key: k, message: `${k[0]!.toUpperCase()}${k.slice(1)} should be between ${lim.min} and ${lim.max}.`, severity: "error" });
      }
    });
  }
  for (const f of MEASURE_FIELDS) {
    const v = p.body[f.key];
    if (v === undefined || v === null || !Number.isFinite(v)) {
      issues.push({ key: f.key, message: `${f.label} is missing.`, severity: "error" });
    } else if (v < f.min || v > f.max) {
      issues.push({ key: f.key, message: `${f.label} should be between ${f.min} and ${f.max} cm.`, severity: "error" });
    }
  }
  const m = p.body;
  if (m.chest && m.stomach && m.stomach > m.chest + 25) {
    issues.push({ key: "stomach", message: "Stomach is much larger than chest — please re-measure both.", severity: "warning" });
  }
  if (m.chest && m.stomach && m.chest > m.stomach + 45) {
    issues.push({ key: "chest", message: "Chest is much larger than stomach — please double-check.", severity: "warning" });
  }
  if (m.trouserWaist && m.hips && m.trouserWaist > m.hips + 10) {
    issues.push({ key: "trouserWaist", message: "Trouser waist is larger than hips — please double-check.", severity: "warning" });
  }
  if (m.wrist && m.bicep && m.wrist >= m.bicep) {
    issues.push({ key: "wrist", message: "Wrist can't be larger than bicep.", severity: "error" });
  }
  if (b && m.inseam && m.inseam > b.height * 0.55) {
    issues.push({ key: "inseam", message: "Inseam looks long for your height — measure from the crotch seam to the floor, shoes on.", severity: "warning" });
  }
  if (b && m.sleeve && (m.sleeve < b.height * 0.3 || m.sleeve > b.height * 0.42)) {
    issues.push({ key: "sleeve", message: "Sleeve length looks unusual for your height — please re-check.", severity: "warning" });
  }
  return issues;
}

export function hasBlockingIssues(p: FitProfile | null | undefined): boolean {
  return validateFitProfile(p).some((i) => i.severity === "error");
}

/** Sanitise an untrusted fit profile (server side) into a clean snapshot. */
export function sanitizeFitProfile(raw: unknown): FitProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<FitProfile>;
  const method = (["estimate", "self", "onfile", "atelier"] as const).find((m) => m === r.method);
  if (!method) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : undefined);
  const body: FitProfile["body"] = {};
  if (method === "estimate" || method === "self") {
    for (const f of MEASURE_FIELDS) {
      const v = num((r.body as Record<string, unknown> | undefined)?.[f.key]);
      if (v !== undefined) body[f.key] = v;
    }
  }
  const basicsRaw = r.basics as Partial<BodyBasics> | null | undefined;
  const basics =
    basicsRaw && (method === "estimate" || method === "self")
      ? { height: num(basicsRaw.height) ?? 0, weight: num(basicsRaw.weight) ?? 0, age: Math.round(num(basicsRaw.age) ?? 0) }
      : null;
  const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
  const b = (r.build ?? {}) as Partial<BuildProfile>;
  return {
    v: 1,
    name: String(r.name ?? "My profile").slice(0, 40) || "My profile",
    method,
    units: r.units === "in" ? "in" : "cm",
    basics,
    body,
    build: {
      shoulders: pick(b.shoulders, ["sloping", "average", "square"] as const, "average"),
      posture: pick(b.posture, ["upright", "average", "forward"] as const, "average"),
      stomach: pick(b.stomach, ["flat", "average", "rounded"] as const, "average"),
      seat: pick(b.seat, ["flat", "average", "prominent"] as const, "average"),
    },
    onFileId: method === "onfile" && typeof r.onFileId === "string" ? r.onFileId.slice(0, 64) : undefined,
    onFileTakenAt: method === "onfile" && typeof r.onFileTakenAt === "string" ? r.onFileTakenAt.slice(0, 32) : undefined,
    updatedAt: new Date().toISOString(),
  };
}
