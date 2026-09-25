"use client";

import { useEffect, useRef, useState } from "react";
import manifest from "@/lib/suit/photo-assets.json";
import { getFabric } from "@/lib/suit/catalogue";
import type { SuitConfig } from "@/lib/suit/types";

/**
 * Photographic front view. Nano Banana Pro product shots of one neutral-grey
 * luxury suit (per style), turned into layers by scripts/build-suit-photos.py.
 * Here the chosen cloth texture is tiled and multiplied by the photo's shading
 * inside the cloth mask; everything outside the AI-matted garment stays
 * transparent, so nothing bleeds onto the background.
 */

type Assets = Record<string, { width: number; height: number }>;
const ASSETS = (manifest as { assets: Assets; tilePx: number }).assets;
const TILE = (manifest as { tilePx: number }).tilePx ?? 180;

export type PhotoView = "front" | "back" | "lining" | "waistcoat";

export function choosePhoto(config: SuitConfig, view: PhotoView = "front"): string | null {
  const o = config.options;
  const has = (k: string) => (k in ASSETS ? k : null);
  if (view === "back") return has(`back-${o["jacket.vents"] ?? "side"}`);
  if (view === "lining") return has("inside");
  if (view === "waistcoat") return o["waistcoat.style"] === "db6" ? has("waistcoat-db6") : has("waistcoat-sb5");
  const closure = o["jacket.closure"] ?? "sb2";
  const lapel = o["jacket.lapel"] ?? "notch";
  const pockets = o["jacket.pockets"] ?? "flap";
  if (closure === "mandarin") return has("front-mandarin");
  if (closure === "db4") return has("front-db4-peak");
  if (closure === "db6") return has("front-db6-peak");
  if (lapel === "shawl") return has("front-sb1-shawl");
  if (closure === "sb1") return has(`front-sb1-${lapel}`) ?? has(`front-sb2-${lapel}`);
  if (closure === "sb3") return has("front-sb3-notch");
  if (lapel === "notch" && pockets !== "flap") return has(`front-sb2-${pockets === "none" ? "jetted" : pockets}`) ?? has("front-sb2-notch");
  return has(`front-sb2-${lapel}`) ?? has("front-sb2-notch");
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
async function render(asset: string, fabricId: string): Promise<ImageData> {
  const key = `${asset}|${fabricId}`;
  const hit = done.get(key);
  if (hit) return hit;
  const f = getFabric(fabricId) ?? getFabric("house-navy-stretch")!;
  const dir = `/suit-photos/${asset}`;
  const [base, shade, mask, tex] = await Promise.all([load(`${dir}/base.webp`), load(`${dir}/shade.webp`), load(`${dir}/mask.png`), load(`/textures/fabrics/${f.id}.jpg`, TILE, TILE)]);
  const W = base.width;
  const H = base.height;
  const out = new ImageData(W, H);
  const b = base.data;
  const s = shade.data;
  const m = mask.data;
  const t = tex.data;
  const o = out.data;
  for (let y = 0; y < H; y++) {
    const ty = (y % TILE) * TILE;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = b[i + 3]!;
      if (a === 0) continue;
      const c = m[i]! / 255;
      let r = b[i]!;
      let g = b[i + 1]!;
      let bl = b[i + 2]!;
      if (c > 0.002) {
        const k = (ty + (x % TILE)) * 4;
        const sh = s[i]! / 128;
        r = r * (1 - c) + t[k]! * sh * c;
        g = g * (1 - c) + t[k + 1]! * sh * c;
        bl = bl * (1 - c) + t[k + 2]! * sh * c;
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

export function PhotoPreview({ config, view = "front", className = "", title, fit = "contain", fallback }: { config: SuitConfig; view?: PhotoView; className?: string; title?: string; fit?: "contain" | "width"; fallback: React.ReactNode }) {
  const asset = choosePhoto(config, view);
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const fabric = view === "waistcoat" ? (config.waistcoatFabric ?? config.fabric) : config.fabric;

  useEffect(() => {
    if (!asset) return;
    let off = false;
    render(asset, fabric)
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
  }, [asset, fabric]);

  if (!asset || state === "error") return <>{fallback}</>;
  const meta = ASSETS[asset]!;
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={ref}
        width={meta.width}
        height={meta.height}
        role="img"
        aria-label={title ?? "Your suit"}
        className={`block transition-opacity duration-300 ${fit === "width" ? "h-auto w-full" : "h-full max-h-full w-auto max-w-full"} ${state === "ready" ? "opacity-100" : "opacity-0"}`}
      />
      {state === "loading" ? <span className="absolute text-[11px] uppercase tracking-wide text-muted">Preparing your cloth…</span> : null}
    </div>
  );
}
