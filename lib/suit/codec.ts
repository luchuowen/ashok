import { defaultOptions } from "./catalogue";
import { normalizeConfig } from "./rules";
import type { SuitConfig } from "./types";

/**
 * Compact, URL-safe encoding of a design for share links (?d=…). Only
 * options that differ from the defaults are included, so links stay short.
 * Decoding always runs normalizeConfig — a shared link can never produce an
 * invalid design, whatever someone edits into it.
 */
function toBase64Url(s: string): string {
  const b64 = typeof window === "undefined" ? Buffer.from(s, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return typeof window === "undefined" ? Buffer.from(b64, "base64").toString("utf8") : decodeURIComponent(escape(atob(b64)));
}

export function encodeDesign(c: SuitConfig): string {
  const defaults = defaultOptions();
  const diff: Record<string, string> = {};
  for (const [k, v] of Object.entries(c.options)) if (defaults[k] !== v) diff[k] = v;
  const payload = {
    f: c.fabric,
    t: c.trouserFabric ?? undefined,
    w: c.waistcoatFabric ?? undefined,
    o: diff,
    l: c.lining,
    h: c.thread,
    m: c.monogram ?? undefined,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeDesign(code: string): SuitConfig | null {
  try {
    const p = JSON.parse(fromBase64Url(code)) as {
      f?: string;
      t?: string;
      w?: string;
      o?: Record<string, string>;
      l?: string;
      h?: string;
      m?: SuitConfig["monogram"];
    };
    if (!p || typeof p !== "object" || typeof p.f !== "string") return null;
    const { config } = normalizeConfig({
      v: 1,
      fabric: p.f,
      trouserFabric: p.t ?? null,
      waistcoatFabric: p.w ?? null,
      options: { ...defaultOptions(), ...(p.o ?? {}) },
      lining: p.l ?? "oxblood",
      thread: p.h ?? "oxblood",
      monogram: p.m ?? null,
      notes: "",
    });
    return config;
  } catch {
    return null;
  }
}

/** Stable short fingerprint of a design (for dedupe/ids). */
export function designHash(c: SuitConfig): string {
  const s = JSON.stringify([c.fabric, c.trouserFabric, c.waistcoatFabric, c.options, c.lining, c.thread, c.monogram, c.notes]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
