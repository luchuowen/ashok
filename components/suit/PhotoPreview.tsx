"use client";

import { useEffect, useRef, useState } from "react";
import manifest from "@/lib/suit/photo-assets.json";
import textureScale from "@/lib/suit/texture-scale.json";
import { BUTTON_HEX, getFabric, LINING_COLOURS } from "@/lib/suit/catalogue";
import type { SuitConfig } from "@/lib/suit/types";

/**
 * Photographic front view. Nano Banana Pro product shots of one neutral-grey
 * luxury suit (per style), turned into layers by scripts/build-suit-photos.py.
 * Here the chosen cloth texture is tiled and multiplied by the photo's shading
 * inside the cloth mask; everything outside the AI-matted garment stays
 * transparent, so nothing bleeds onto the background.
 */

type Assets = Record<string, { width: number; height: number; split?: number }>;
const ASSETS = (manifest as { assets: Assets; tilePx: number }).assets;
const TILE = (manifest as { tilePx: number }).tilePx ?? 180;
/** Photographed cloths (scripts/fabric-photos-to-textures.py) tile at their true scale. */
const tileFor = (id: string) => (textureScale as Record<string, number>)[id] ?? TILE;

export type PhotoView = "front" | "back" | "lining" | "waistcoat" | "nojacket";

/**
 * Configuration -> photo. Every configuration gets a photograph: options that
 * have no dedicated shot use the closest one (the Detail drawing is only a
 * last resort when an asset fails to load).
 */
export function choosePhoto(config: SuitConfig, view: PhotoView = "front"): string | null {
  const o = config.options;
  const has = (k: string) => (k in ASSETS ? k : null);
  const three = o["suit.pieces"] === "three";
  if (view === "back") return has(`back-${o["jacket.vents"] ?? "side"}`) ?? has("back-side");
  if (view === "lining") return has("inside");
  if (view === "nojacket") return (three ? has("nojacket-vest") : null) ?? has("nojacket");
  if (view === "waistcoat") {
    const db = o["waistcoat.style"] === "db6";
    return (db ? has("waistcoat-db6") : has("waistcoat-sb5")) ?? has("waistcoat-sb5");
  }
  const closure = o["jacket.closure"] ?? "sb2";
  const lapel = o["jacket.lapel"] ?? "notch";
  const pockets = o["jacket.pockets"] ?? "flap";
  if (closure === "mandarin") return has("front-mandarin");
  if (closure === "db4") return has("front-db4-peak") ?? has("front-db6-peak");
  if (closure === "db6") return has("front-db6-peak");
  if (three && (closure === "sb2" || closure === "sb3") && lapel !== "shawl") return has(`front-3pc-${lapel}`) ?? has("front-3pc-notch") ?? has("front-sb2-notch");
  if (lapel === "shawl") return has("front-sb1-shawl");
  if (closure === "sb1") return has(`front-sb1-${lapel}`) ?? has(`front-sb2-${lapel}`);
  if (closure === "sb3") return has("front-sb3-notch");
  if (lapel === "notch" && pockets !== "flap") return has(`front-sb2-${pockets === "none" ? "jetted" : pockets}`) ?? has("front-sb2-notch");
  return has(`front-sb2-${lapel}`) ?? has("front-sb2-notch");
}

function shadeHex(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
}

const cache = new Map<string, Promise<ImageData>>();
function load(src: string, w?: number, h?: number) {
  const key = `${src}@${w ?? ""}`;
  let p = cache.get(key);
  if (!p) {
    p = new Promise<ImageData>((res, rej) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const cw = w ?? img.naturalWidth;
        const ch = h ?? img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        const x = c.getContext("2d", { willReadFrequently: true })!;
        x.imageSmoothingQuality = "high";
        x.drawImage(img, 0, 0, cw, ch);
        res(x.getImageData(0, 0, cw, ch));
      };
      img.onerror = () => {
        cache.delete(key);
        rej(new Error(src));
      };
      img.src = src;
    });
    cache.set(key, p);
  }
  return p;
}

const done = new Map<string, ImageData>();
async function render(asset: string, fabricId: string, linHex: string, trouserId: string = fabricId, btnHex: string | null = null): Promise<ImageData> {
  const key = `${asset}|${fabricId}|${trouserId}|${linHex}|${btnHex}`;
  const bn = btnHex ? parseInt(btnHex.slice(1), 16) : 0;
  const BR = (bn >> 16) & 255, BG = (bn >> 8) & 255, BB = bn & 255;
  const ln = parseInt(linHex.slice(1), 16);
  const LR = (ln >> 16) & 255, LG = (ln >> 8) & 255, LB = ln & 255;
  const hit = done.get(key);
  if (hit) return hit;
  const f = getFabric(fabricId) ?? getFabric("house-navy-stretch")!;
  const tf = getFabric(trouserId) ?? f;
  const dir = `/suit-photos/${asset}`;
  const [base, shade, mask, tex, ttex] = await Promise.all([
    load(`${dir}/base.webp`),
    load(`${dir}/shade.webp`),
    load(`${dir}/mask.png`),
    load(`/textures/fabrics/${f.id}.jpg`, tileFor(f.id), tileFor(f.id)),
    load(`/textures/fabrics/${tf.id}.jpg`, tileFor(tf.id), tileFor(tf.id)),
  ]);
  const split = ASSETS[asset]?.split ?? 1e9;
  const W = base.width;
  const H = base.height;
  const out = new ImageData(W, H);
  const b = base.data;
  const s = shade.data;
  const m = mask.data;
  const o = out.data;
  for (let y = 0; y < H; y++) {
    const lower = y >= split;
    const t = lower ? ttex.data : tex.data;
    const T = lower ? ttex.width : tex.width;
    const ty = (y % T) * T;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = b[i + 3]!;
      if (a === 0) continue;
      const c = m[i]! / 255;
      let r = b[i]!;
      let g = b[i + 1]!;
      let bl = b[i + 2]!;
      if (c > 0.002) {
        const k = (ty + (x % T)) * 4;
        const sh = s[i]! / 128;
        r = r * (1 - c) + t[k]! * sh * c;
        g = g * (1 - c) + t[k + 1]! * sh * c;
        bl = bl * (1 - c) + t[k + 2]! * sh * c;
      }
      const lm = m[i + 1]! / 255;
      if (lm > 0.002) {
        const sh = s[i]! / 128;
        r = r * (1 - lm) + LR * sh * lm;
        g = g * (1 - lm) + LG * sh * lm;
        bl = bl * (1 - lm) + LB * sh * lm;
      }
      const bm = btnHex ? m[i + 2]! / 255 : 0;
      if (bm > 0.002) {
        const lum = (0.3 * b[i]! + 0.59 * b[i + 1]! + 0.11 * b[i + 2]!) / 70;
        r = r * (1 - bm) + Math.min(255, BR * lum) * bm;
        g = g * (1 - bm) + Math.min(255, BG * lum) * bm;
        bl = bl * (1 - bm) + Math.min(255, BB * lum) * bm;
      }
      o[i] = r;
      o[i + 1] = g;
      o[i + 2] = bl;
      o[i + 3] = a;
    }
  }
  if (done.size > 30) done.delete(done.keys().next().value!);
  done.set(key, out);
  return out;
}

export type Crop = { x: number; y: number; w: number; h: number };
/** Close-up of the jacket front: lapels, buttons, breast and hip pockets. */
export const DETAIL_CROP: Crop = { x: 0.17, y: 0.07, w: 0.66, h: 0.5 };

export function PhotoPreview({
  config,
  view = "front",
  className = "",
  title,
  fit = "contain",
  crop,
  fallback,
}: {
  config: SuitConfig;
  view?: PhotoView;
  className?: string;
  title?: string;
  fit?: "contain" | "width";
  crop?: Crop;
  fallback: React.ReactNode;
}) {
  const asset = choosePhoto(config, view);
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const fabric = view === "waistcoat" || view === "nojacket" ? (config.waistcoatFabric ?? config.fabric) : config.fabric;
  const trousers = view === "waistcoat" ? fabric : (config.trouserFabric ?? config.fabric);
  const custom = config.options["accents.liningColour"] === "custom" && config.options["accents.liningStyle"] !== "unlined";
  const linHex = (custom ? LINING_COLOURS.find((l) => l.id === config.lining)?.hex : null) ?? shadeHex(getFabric(config.fabric)?.hex ?? "#1a2440", -0.3);
  const btn = config.options["accents.buttons"];
  const btnHex = btn && btn !== "matched" ? (BUTTON_HEX[btn] ?? null) : null;

  const cropped = crop ? 1 : 0;
  useEffect(() => {
    if (!asset) return;
    let off = false;
    render(asset, fabric, linHex, trousers, btnHex)
      .then((d) => {
        const c = ref.current;
        if (off || !c) return;
        c.width = d.width;
        c.height = d.height;
        c.getContext("2d")!.putImageData(d, 0, 0);
        setState("ready");
      })
      .catch(() => !off && setState("error"));
    return () => {
      off = true;
    };
  }, [asset, fabric, linHex, trousers, btnHex, cropped]);

  if (!asset || state === "error") return <>{fallback}</>;
  const meta = ASSETS[asset]!;
  const fade = `transition-opacity duration-300 ${state === "ready" ? "opacity-100" : "opacity-0"}`;
  const loading = state === "loading" ? <span className="absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-wide text-muted">Preparing your cloth…</span> : null;

  if (crop) {
    const ar = (crop.w * meta.width) / (crop.h * meta.height);
    const frame = (
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: String(ar) }}>
        <canvas
          ref={ref}
          width={meta.width}
          height={meta.height}
          role="img"
          aria-label={title ?? "Your suit, close up"}
          className={`absolute block max-w-none ${fade}`}
          style={{ width: `${100 / crop.w}%`, left: `${(-crop.x / crop.w) * 100}%`, top: `${(-crop.y / crop.h) * 100}%` }}
        />
        {loading}
      </div>
    );
    return fit === "width" ? (
      <div className={`relative ${className}`}>{frame}</div>
    ) : (
      <div className={`relative flex items-center justify-center ${className}`} style={{ containerType: "size" }}>
        <div style={{ width: `min(100cqw, calc(100cqh * ${ar}))` }}>{frame}</div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={ref}
        width={meta.width}
        height={meta.height}
        role="img"
        aria-label={title ?? "Your suit"}
        className={`block ${fit === "width" ? "h-auto w-full" : "h-full max-h-full w-auto max-w-full"} ${fade}`}
      />
      {loading}
    </div>
  );
}
