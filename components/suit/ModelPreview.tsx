"use client";

import { useEffect, useRef, useState } from "react";
import manifest from "@/lib/suit/model-poses.json";
import { getFabric, getOptionValue } from "@/lib/suit/catalogue";
import type { SuitConfig } from "@/lib/suit/types";
import { SuitPreview } from "./SuitPreview";

/**
 * On-model preview: a studio photo of a model in a neutral grey suit, re-dyed
 * in the browser with the chosen cloth. Per pose, scripts/build-model-poses.py
 * ships the photo plus a normalised shading map and part masks; here the fabric
 * texture is tiled and multiplied by the shading inside each mask, so folds,
 * light and shadow come from the photograph. Skin tone and tie colour are
 * re-coloured the same way.
 */

type PoseId = keyof typeof manifest.poses;
type Pose = (typeof manifest.poses)[PoseId];
export type ModelView = "front" | "back";

export const SKIN_TONES = [
  { id: "deep", label: "Deep", rgb: [92, 58, 38] as const },
  { id: "brown", label: "Brown", rgb: null },
  { id: "tan", label: "Tan", rgb: [190, 140, 105] as const },
  { id: "light", label: "Light", rgb: [214, 172, 140] as const },
] as const;
export type SkinToneId = (typeof SKIN_TONES)[number]["id"];

const SHIRT = [248, 247, 244];

/** Which photograph shows this configuration best (null would fall back to the flat drawing). */
export function choosePose(config: SuitConfig, view: ModelView, hideJacket: boolean): PoseId | null {
  const o = config.options;
  if (view === "back") return "back";
  const three = o["suit.pieces"] === "three";
  const tie = (o["accents.necktie"] ?? "none") !== "none";
  const bow = (o["accents.bowtie"] ?? "none") !== "none";
  const neck = tie || bow;
  if (hideJacket) return three ? "front-waistcoat" : "front-nojacket";
  const closure = o["jacket.closure"] ?? "sb2";
  if (closure === "mandarin") return "front-mandarin";
  if (three) return neck ? "front-threepiece" : "front-threepiece-notie";
  if (closure === "db4" || closure === "db6") return neck ? "front-db6-peak" : "front-db6-peak-notie";
  if (closure === "sb1" || o["jacket.lapel"] === "shawl") return neck ? "front-sb1-shawl" : "front-sb1-shawl-notie";
  if (bow) return "front-bowtie";
  return tie ? "front-sb2-notch" : "front-notie";
}

function neckwearRgb(config: SuitConfig): number[] | null {
  const o = config.options;
  const hex = getOptionValue("accents.necktie", o["accents.necktie"] ?? "none")?.hex ?? getOptionValue("accents.bowtie", o["accents.bowtie"] ?? "none")?.hex;
  if (!hex) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ---------- image loading (cached for the page's lifetime) ---------- */

const dataCache = new Map<string, Promise<ImageData>>();
function loadData(src: string, w?: number, h?: number): Promise<ImageData> {
  const key = `${src}@${w ?? ""}x${h ?? ""}`;
  let p = dataCache.get(key);
  if (!p) {
    p = new Promise<ImageData>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const cw = w ?? img.naturalWidth;
        const ch = h ?? img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, cw, ch);
        resolve(ctx.getImageData(0, 0, cw, ch));
      };
      img.onerror = () => {
        dataCache.delete(key);
        reject(new Error(`Could not load ${src}`));
      };
      img.src = src;
    });
    dataCache.set(key, p);
  }
  return p;
}

const composites = new Map<string, ImageData>();

async function renderPose(poseId: PoseId, config: SuitConfig, skin: SkinToneId): Promise<ImageData> {
  const pose: Pose = manifest.poses[poseId];
  const tie = pose.hasTie ? neckwearRgb(config) : null;
  const skinRgb = SKIN_TONES.find((t) => t.id === skin)?.rgb ?? null;
  const jf = config.fabric;
  const tf = config.trouserFabric ?? config.fabric;
  const wf = config.waistcoatFabric ?? config.fabric;
  const key = [poseId, jf, tf, wf, tie?.join(",") ?? "-", skin].join("|");
  const hit = composites.get(key);
  if (hit) return hit;

  const T = manifest.tilePx;
  const dir = `/model/${poseId}`;
  const tex = (id: string) => loadData(`/textures/fabrics/${(getFabric(id) ?? getFabric("house-navy-stretch")!).id}.jpg`, T, T);
  const [base, shade, mask, mask2, tj, tt, tw] = await Promise.all([
    loadData(`${dir}/base.jpg`),
    loadData(`${dir}/shade.jpg`),
    loadData(`${dir}/mask.png`),
    loadData(`${dir}/mask2.png`),
    tex(jf),
    tex(tf),
    tex(wf),
  ]);

  const W = base.width;
  const H = base.height;
  const out = new ImageData(W, H);
  const b = base.data;
  const s = shade.data;
  const m = mask.data;
  const m2 = mask2.data;
  const o = out.data;
  const J = tj.data;
  const Tr = tt.data;
  const Wc = tw.data;
  const sk = pose.skin;
  const dR = skinRgb ? skinRgb[0] - sk[0]! : 0;
  const dG = skinRgb ? skinRgb[1] - sk[1]! : 0;
  const dB = skinRgb ? skinRgb[2] - sk[2]! : 0;
  const tieCol = tie ?? SHIRT; // no tie chosen: the photographed tie is painted as shirt
  const tieGain = 1.05;

  for (let y = 0; y < H; y++) {
    const ty = (y % T) * T;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let r = b[i]!;
      let g = b[i + 1]!;
      let bl = b[i + 2]!;
      const sh = s[i]! / 128;
      const mj = m[i]! / 255;
      const mt = m[i + 1]! / 255;
      const mw = m[i + 2]! / 255;
      const sum = mj + mt + mw;
      if (sum > 0.002) {
        const t = (ty + (x % T)) * 4;
        const k = 1 - sum;
        r = r * k + (J[t]! * mj + Tr[t]! * mt + Wc[t]! * mw) * sh;
        g = g * k + (J[t + 1]! * mj + Tr[t + 1]! * mt + Wc[t + 1]! * mw) * sh;
        bl = bl * k + (J[t + 2]! * mj + Tr[t + 2]! * mt + Wc[t + 2]! * mw) * sh;
      }
      const mtie = m2[i + 1]! / 255;
      if (mtie > 0.002) {
        // A chosen tie keeps the photographed folds; no tie paints plain shirt over it.
        const v = tie ? sh * tieGain : 0.965;
        r = r * (1 - mtie) + tieCol[0]! * v * mtie;
        g = g * (1 - mtie) + tieCol[1]! * v * mtie;
        bl = bl * (1 - mtie) + tieCol[2]! * v * mtie;
      }
      const ms = m2[i]! / 255;
      if (skinRgb && ms > 0.002) {
        const v = Math.min(sh, 1.3) * 0.95 * ms;
        r += dR * v;
        g += dG * v;
        bl += dB * v;
      }
      o[i] = r;
      o[i + 1] = g;
      o[i + 2] = bl;
      o[i + 3] = 255 - m2[i + 2]!; // studio backdrop -> transparent
    }
  }
  if (composites.size > 24) composites.delete(composites.keys().next().value!);
  composites.set(key, out);
  return out;
}

export function ModelPreview({
  config,
  view = "front",
  hideJacket = false,
  skin = "brown",
  className = "",
  title,
  fit = "contain",
}: {
  config: SuitConfig;
  view?: ModelView;
  hideJacket?: boolean;
  skin?: SkinToneId;
  className?: string;
  title?: string;
  /** "contain": fit inside the box (stage); "width": fill the width, natural height (close-up). */
  fit?: "contain" | "width";
}) {
  const poseId = choosePose(config, view, hideJacket);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!poseId) return;
    let cancelled = false;
    renderPose(poseId, config, skin)
      .then((data) => {
        if (cancelled || !canvasRef.current) return;
        const c = canvasRef.current;
        if (c.width !== data.width) c.width = data.width;
        if (c.height !== data.height) c.height = data.height;
        c.getContext("2d")!.putImageData(data, 0, 0);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [poseId, config, skin]);

  if (!poseId || state === "error") {
    return <SuitPreview config={config} view={view === "back" ? "back" : "front"} hideJacket={hideJacket} className={className} title={title} />;
  }
  const pose = manifest.poses[poseId];
  return (
    <div className={`relative flex items-center justify-center ${fit === "width" ? "min-h-[60vh]" : ""} ${className}`}>
      <canvas
        ref={canvasRef}
        width={pose.width}
        height={pose.height}
        role="img"
        aria-label={title ?? "Your suit, worn"}
        className={`block transition-opacity duration-300 ${fit === "width" ? "h-auto w-full" : "h-full max-h-full w-auto max-w-full object-contain"} ${state === "ready" ? "opacity-100" : "opacity-0"}`}
      />
      {state === "loading" ? <span className="absolute text-[11px] uppercase tracking-wide text-muted">Dressing the model…</span> : null}
    </div>
  );
}
