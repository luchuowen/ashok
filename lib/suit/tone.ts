// Shared cloth tone helpers for the photo and on-model previews (client-safe, no deps).

/** 1 for dark cloth (full photographic highlights) down to 0.45 for the lightest cloths. */
export function highlightScale(tex: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < tex.length; i += 4 * 7) {
    sum += 0.3 * tex[i]! + 0.59 * tex[i + 1]! + 0.11 * tex[i + 2]!;
    n++;
  }
  const lum = n ? sum / n : 0;
  const f = Math.min(1, Math.max(0, (lum - 90) / 110));
  return 1 - 0.55 * f;
}

/** Soft shoulder: light cloth rolls off toward white instead of clipping flat. */
export function rolloff(v: number): number {
  return v <= 205 ? v : 205 + 50 * (1 - Math.exp(-(v - 205) / 50));
}
