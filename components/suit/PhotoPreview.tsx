"use client";

import { useEffect, useRef, useState } from "react";
import manifest from "@/lib/suit/photo-assets.json";
import textureScale from "@/lib/suit/texture-scale.json";
import { BUTTON_HEX, getFabric, getOptionValue, LINING_COLOURS, THREAD_COLOURS } from "@/lib/suit/catalogue";
import type { SuitConfig } from "@/lib/suit/types";
import { highlightScale, rolloff } from "@/lib/suit/tone";

/**
 * Photographic front view. Nano Banana Pro product shots of one neutral-grey
 * luxury suit (per style), turned into layers by scripts/build-suit-photos.py.
 * Here the chosen cloth texture is tiled and multiplied by the photo's shading
 * inside the cloth mask; everything outside the AI-matted garment stays
 * transparent, so nothing bleeds onto the background.
 */

type Assets = Record<string, { width: number; height: number; split?: number; buttons?: number[][] }>;
const ASSETS = (manifest as { assets: Assets; tilePx: number }).assets;
const TILE = (manifest as { tilePx: number }).tilePx ?? 180;
/** Photographed cloths (scripts/fabric-photos-to-textures.py) tile at their true scale. */
/** Trouser stripes run along the folded leg (horizontal). */
const TA = 0; // exact axis swap: rotated sampling of 1px pinstripes aliases into dashes
const TC = Math.cos(TA);
const TS = Math.sin(TA);
const tileFor = (id: string) => (textureScale as Record<string, number>)[id] ?? TILE;

export const hasPhoto = (asset: string) => asset in ASSETS;

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
  const neckwear = (o["accents.necktie"] ?? "none") !== "none" || (o["accents.bowtie"] ?? "none") !== "none";
  if (!three && neckwear && closure === "sb2" && lapel === "notch" && pockets === "flap" && has("front-shirt-notch")) return "front-shirt-notch";
  if (three && closure === "sb2" && lapel === "notch" && pockets === "flap" && has("front-3pc-notch")) return "front-3pc-notch";
  if (lapel === "shawl") return has("front-sb1-shawl");
  if (closure === "sb1") return has(`front-sb1-${lapel}`) ?? has(`front-sb2-${lapel}`);
  if (closure === "sb3" && lapel === "notch" && pockets === "flap") return has("front-sb3-notch");
  if (closure === "sb1" && pockets !== "flap" && lapel === "notch") return has(`front-sb2-${pockets === "none" ? "jetted" : pockets}`);
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
async function render(asset: string, fabricId: string, linHex: string, trouserId: string = fabricId, btnHex: string | null = null, liningMode = "full"): Promise<ImageData> {
  const key = `${asset}|${fabricId}|${trouserId}|${linHex}|${btnHex}|${liningMode}`;
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
  // Light cloths (linen, cream, sky) must stay matte: the photo's highlights are compressed in
  // proportion to how light the cloth is, and values near white roll off instead of clipping.
  const hsJ = highlightScale(tex.data);
  const hsT = highlightScale(ttex.data);
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
        // Folded trousers lie across the frame: their stripes run along the leg (near horizontal).
        let k: number;
        if (lower) {
          const u = Math.floor(x * TC + y * TS) % T; // texture row runs along the leg
          const v = Math.floor(y * TC - x * TS) % T; // texture column across it
          k = (((u + T) % T) * T + ((v + T) % T)) * 4;
        } else k = (ty + (x % T)) * 4;
        const s0 = s[i]! / 128;
        const sh = s0 > 1 ? 1 + (s0 - 1) * (lower ? hsT : hsJ) : s0;
        r = r * (1 - c) + rolloff(t[k]! * sh) * c;
        g = g * (1 - c) + rolloff(t[k + 1]! * sh) * c;
        bl = bl * (1 - c) + rolloff(t[k + 2]! * sh) * c;
      }
      let lm = m[i + 1]! / 255;
      // Half-lined / unlined: the lower lining (or all of it) shows the cloth's inside face.
      if (lm > 0.002 && (liningMode === "unlined" || (liningMode === "half" && y > H * 0.5))) {
        const k = (ty + (x % T)) * 4;
        const sh = (s[i]! / 128) * 0.82;
        r = r * (1 - lm) + t[k]! * sh * lm;
        g = g * (1 - lm) + t[k + 1]! * sh * lm;
        bl = bl * (1 - lm) + t[k + 2]! * sh * lm;
        lm = 0;
      }
      if (lm > 0.002) {
        const sh = s[i]! / 128;
        r = r * (1 - lm) + LR * sh * lm;
        g = g * (1 - lm) + LG * sh * lm;
        bl = bl * (1 - lm) + LB * sh * lm;
      }
      const bm = m[i + 2]! / 255;
      if (bm > 0.002) {
        // Buttons: the photographed horn laid back over the dyed cloth (or tinted to the chosen button).
        let br = b[i]!, bg = b[i + 1]!, bb = b[i + 2]!;
        if (btnHex) {
          const lum = (0.3 * br + 0.59 * bg + 0.11 * bb) / 70;
          br = Math.min(255, BR * lum);
          bg = Math.min(255, BG * lum);
          bb = Math.min(255, BB * lum);
        }
        r = r * (1 - bm) + br * bm;
        g = g * (1 - bm) + bg * bm;
        bl = bl * (1 - bm) + bb * bm;
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

/* ---------- Overlays drawn on top of the dyed photo (stage pixels at 1200 px width) ---------- */

/** Top edge of the welt breast pocket and the lapel buttonhole, per front photo. */
const POCKET: Record<string, [number, number, number, number]> = { default: [706, 439, 793, 425] };
const LAPEL_HOLE: Record<string, [number, number]> = {
  "front-sb2-notch": [729, 316], "front-sb2-jetted": [726, 317], "front-sb2-patch": [728, 319], "front-3pc-notch": [730, 316],
  "front-sb1-notch": [726, 313], "front-sb1-peak": [737, 328], "front-sb2-peak": [731, 327], "front-sb3-notch": [724, 315],
  "front-db4-peak": [730, 344], "front-db6-peak": [730, 342],
};
const FIT_JACKET: Record<string, number> = { slim: 0.965, classic: 1, relaxed: 1.04 };
const FIT_TROUSERS: Record<string, number> = { slim: 0.95, classic: 1, relaxed: 1.06 };

function hexRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function drawPocketSquare(x: CanvasRenderingContext2D, asset: string, hex: string) {
  const [x1, y1, x2, y2] = POCKET[asset] ?? POCKET.default!;
  const [r, g, b] = hexRgb(hex);
  const w = x2 - x1;
  const lx = x1 + w * 0.12, rx = x2 - w * 0.08;
  const ly = y1 + (y2 - y1) * 0.12, ry = y1 + (y2 - y1) * 0.92;
  x.save();
  x.beginPath();
  // two soft silk points rising out of the welt
  x.moveTo(lx, ly + 2);
  x.bezierCurveTo(lx + w * 0.08, ly - 20, lx + w * 0.2, ly - 34, lx + w * 0.3, ly - 36);
  x.bezierCurveTo(lx + w * 0.38, ly - 30, lx + w * 0.42, ly - 22, lx + w * 0.47, ly - 20);
  x.bezierCurveTo(lx + w * 0.55, ly - 30, lx + w * 0.64, ly - 44, lx + w * 0.72, ly - 46);
  x.bezierCurveTo(lx + w * 0.8, ly - 36, rx - 4, ry - 18, rx, ry + 2);
  x.closePath();
  const gr = x.createLinearGradient(lx, ly - 46, rx, ry);
  const L = (k: number) => `rgb(${Math.min(255, r * k)},${Math.min(255, g * k)},${Math.min(255, b * k)})`;
  gr.addColorStop(0, L(1.12));
  gr.addColorStop(0.45, L(0.92));
  gr.addColorStop(0.55, L(1.18));
  gr.addColorStop(1, L(0.8));
  x.fillStyle = gr;
  x.shadowColor = "rgba(0,0,0,0.28)";
  x.shadowBlur = 5;
  x.shadowOffsetY = 1.5;
  x.fill();
  x.shadowColor = "transparent";
  x.strokeStyle = "rgba(0,0,0,0.18)";
  x.lineWidth = 0.8;
  x.stroke();
  // welt shadow where the silk tucks in
  x.beginPath();
  x.moveTo(x1, y1 + 1);
  x.lineTo(x2, y2 + 1);
  x.strokeStyle = "rgba(0,0,0,0.35)";
  x.lineWidth = 2.2;
  x.stroke();
  x.restore();
}

function drawHole(x: CanvasRenderingContext2D, cx: number, cy: number, len: number, angle: number, hex: string) {
  x.save();
  x.translate(cx, cy);
  x.rotate(angle);
  x.strokeStyle = hex;
  x.lineCap = "round";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(len, 0);
  x.stroke();
  x.fillStyle = hex;
  x.beginPath();
  x.arc(0, 0, 2.6, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/** Collar knot point for photos that show the shirt. */
const KNOT: Record<string, [number, number]> = { "front-3pc-notch": [600, 262], "nojacket-vest": [600, 266], "front-shirt-notch": [600, 193], nojacket: [600, 213] };

/** Tie or bow tie, drawn on its own layer and kept only where the white shirt shows. */
function drawNeckwear(x: CanvasRenderingContext2D, asset: string, config: SuitConfig) {
  const k = KNOT[asset];
  if (!k) return;
  const o = config.options;
  const tie = o["accents.necktie"] && o["accents.necktie"] !== "none" ? getOptionValue("accents.necktie", o["accents.necktie"])?.hex : null;
  const bow = o["accents.bowtie"] && o["accents.bowtie"] !== "none" ? getOptionValue("accents.bowtie", o["accents.bowtie"])?.hex : null;
  const hex = bow ?? tie;
  if (!hex) return;
  const W = x.canvas.width, H = x.canvas.height;
  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = H;
  const l = layer.getContext("2d")!;
  const [r, g, b] = hexRgb(hex);
  const L = (m: number) => `rgb(${Math.min(255, r * m)},${Math.min(255, g * m)},${Math.min(255, b * m)})`;
  const [cx, cy] = k;
  const BL = asset.startsWith("nojacket") ? 600 : 372; // blade length: to the waistband without a jacket
  const R = BL + 50;
  if (bow) {
    const gr = l.createLinearGradient(cx - 40, cy, cx + 40, cy);
    gr.addColorStop(0, L(0.8)); gr.addColorStop(0.45, L(1.15)); gr.addColorStop(0.55, L(1.15)); gr.addColorStop(1, L(0.8));
    l.fillStyle = gr;
    l.beginPath();
    l.moveTo(cx, cy); l.bezierCurveTo(cx - 18, cy - 20, cx - 40, cy - 22, cx - 42, cy - 4); l.bezierCurveTo(cx - 44, cy + 12, cx - 22, cy + 18, cx, cy + 4);
    l.bezierCurveTo(cx + 22, cy + 18, cx + 44, cy + 12, cx + 42, cy - 4); l.bezierCurveTo(cx + 40, cy - 22, cx + 18, cy - 20, cx, cy); l.fill();
    l.fillStyle = L(0.7);
    l.fillRect(cx - 7, cy - 9, 14, 17);
  } else {
    const gr = l.createLinearGradient(cx - 30, 0, cx + 30, 0);
    gr.addColorStop(0, L(0.72)); gr.addColorStop(0.5, L(1.12)); gr.addColorStop(1, L(0.72));
    l.fillStyle = gr;
    l.beginPath(); // knot
    l.moveTo(cx - 21, cy - 13); l.lineTo(cx + 21, cy - 13); l.lineTo(cx + 12, cy + 22); l.lineTo(cx - 12, cy + 22); l.closePath(); l.fill();
    l.beginPath(); // blade
    l.moveTo(cx - 11, cy + 22); l.lineTo(cx + 11, cy + 22); l.lineTo(cx + 40, cy + BL - 42); l.lineTo(cx, cy + BL); l.lineTo(cx - 40, cy + BL - 42); l.closePath(); l.fill();
    l.strokeStyle = "rgba(0,0,0,0.25)"; l.lineWidth = 1.2;
    l.beginPath(); l.moveTo(cx - 10, cy + 20); l.lineTo(cx + 10, cy + 20); l.stroke();
  }
  // keep only on the shirt (bright, neutral pixels) - the lapels and waistcoat stay on top
  const src = x.getImageData(0, 0, W, H).data;
  const t = l.getImageData(0, 0, W, H);
  const td = t.data;
  for (let y = Math.max(0, cy - 60); y < Math.min(H, cy + R); y++)
    for (let xx = cx - 90; xx < cx + 90; xx++) {
      const i = (y * W + xx) * 4;
      const R = src[i]!, G = src[i + 1]!, B = src[i + 2]!;
      const lum = 0.3 * R + 0.59 * G + 0.11 * B;
      const sat = Math.max(R, G, B) - Math.min(R, G, B);
      if (!(lum > 150 && sat < 30 && src[i + 3]! > 200)) td[i + 3] = 0;
    }
  for (let y = 0; y < H; y++) if (y < cy - 60 || y >= cy + R) for (let xx = 0; xx < W; xx++) td[(y * W + xx) * 4 + 3] = 0;
  for (let y = cy - 60; y < cy + R; y++) for (let xx = 0; xx < W; xx++) if (xx < cx - 90 || xx >= cx + 90) td[(y * W + xx) * 4 + 3] = 0;
  l.putImageData(t, 0, 0);
  x.save();
  x.shadowColor = "rgba(0,0,0,0.3)";
  x.shadowBlur = 3;
  x.drawImage(layer, 0, 0);
  x.restore();
}

function drawOverlays(x: CanvasRenderingContext2D, asset: string, config: SuitConfig, meta: Assets[string]) {
  const o = config.options;
  drawNeckwear(x, asset, config);
  const thread = THREAD_COLOURS.find((t) => t.id === config.thread)?.hex ?? "#8a4432";
  const front = asset.startsWith("front-");
  if (front) {
    const sq = o["accents.pocketSquare"];
    const sqHex = sq && sq !== "none" ? getOptionValue("accents.pocketSquare", sq)?.hex : null;
    if (sqHex && o["jacket.breastPocket"] !== "none") drawPocketSquare(x, asset, sqHex);
    const holes = o["accents.buttonholes"] ?? "matched";
    if (holes !== "matched") {
      const lh = LAPEL_HOLE[asset];
      if (lh && (holes === "lapel" || holes === "all")) drawHole(x, lh[0] - 12, lh[1] + 2, 24, -0.14, thread);
      const btns = (meta.buttons ?? []).filter((b) => b[1]! < (meta.split ?? 1e9) && Math.abs(b[0]! - 600) < 140);
      if (holes === "all") for (const [bx, by, br] of btns) drawHole(x, bx! + br! + 4, by!, 22, 0, thread);
      if (holes === "cuffs" || holes === "all") {
        for (const sx of [269, 931]) for (let k = 0; k < 4; k++) drawHole(x, sx + (sx < 600 ? 6 : -6), 902 + k * 16, 7, sx < 600 ? 0.1 : Math.PI - 0.1, thread);
      }
    }
  }
  if (asset === "inside" && o["accents.monogram"] === "yes" && config.monogram?.text && config.monogram.placement === "lining") {
    const m = config.monogram;
    const hex = THREAD_COLOURS.find((t) => t.id === m.thread)?.hex ?? thread;
    x.save();
    x.fillStyle = hex;
    x.font = m.font === "script" ? "italic 34px 'Snell Roundhand', 'Brush Script MT', cursive" : m.font === "serif" ? "500 30px Georgia, serif" : "600 26px Arial, sans-serif";
    x.textAlign = "center";
    x.shadowColor = "rgba(0,0,0,0.35)";
    x.shadowBlur = 1.5;
    x.fillText(m.text.slice(0, 12), 492, 842);
    x.restore();
  }
  if (asset === "inside") {
    const uc = o["accents.underCollar"];
    const hex = uc && uc !== "matched" ? getOptionValue("accents.underCollar", uc)?.hex : null;
    if (hex) {
      // melton felt under the collar, seen at the top of the open jacket
      x.save();
      x.globalCompositeOperation = "source-atop";
      x.beginPath();
      x.moveTo(512, 258);
      x.quadraticCurveTo(605, 238, 698, 258);
      x.lineTo(694, 286);
      x.quadraticCurveTo(605, 268, 516, 286);
      x.closePath();
      x.fillStyle = hex;
      x.globalAlpha = 0.92;
      x.fill();
      x.restore();
    }
  }
  if (asset.startsWith("back-")) {
    const ep = o["accents.elbowPatches"];
    const hex = ep && ep !== "none" ? getOptionValue("accents.elbowPatches", ep)?.hex : null;
    if (hex) {
      const [r, g, b] = hexRgb(hex);
      for (const cx of [343, 858]) {
        const gr = x.createRadialGradient(cx - 8, 780, 6, cx, 792, 66);
        gr.addColorStop(0, `rgb(${r * 1.15},${g * 1.15},${b * 1.15})`);
        gr.addColorStop(1, `rgb(${r * 0.78},${g * 0.78},${b * 0.78})`);
        x.save();
        x.globalCompositeOperation = "source-atop";
        x.beginPath();
        x.ellipse(cx, 792, 34, 60, 0, 0, Math.PI * 2);
        x.fillStyle = gr;
        x.shadowColor = "rgba(0,0,0,0.35)";
        x.shadowBlur = 3;
        x.fill();
        x.setLineDash([2, 3]);
        x.strokeStyle = "rgba(0,0,0,0.35)";
        x.lineWidth = 1;
        x.beginPath();
        x.ellipse(cx, 792, 30, 56, 0, 0, Math.PI * 2);
        x.stroke();
        x.restore();
      }
    }
  }
}

/** Paint the dyed photo, scaling jacket and trousers for the chosen fit, then the overlays. */
function paint(c: HTMLCanvasElement, d: ImageData, asset: string, config: SuitConfig) {
  const meta = ASSETS[asset]!;
  c.width = d.width;
  c.height = d.height;
  const x = c.getContext("2d")!;
  const off = document.createElement("canvas");
  off.width = d.width;
  off.height = d.height;
  off.getContext("2d")!.putImageData(d, 0, 0);
  const fj = FIT_JACKET[config.options["jacket.fit"] ?? "classic"] ?? 1;
  const ft = FIT_TROUSERS[config.options["trousers.fit"] ?? "classic"] ?? 1;
  const split = meta.split ?? d.height;
  const W = d.width;
  const scaled = asset.startsWith("front-") || asset.startsWith("back-") || asset.startsWith("nojacket");
  x.clearRect(0, 0, W, d.height);
  if (scaled && (fj !== 1 || ft !== 1)) {
    const top = asset.startsWith("nojacket") ? 1 : fj;
    x.drawImage(off, 0, 0, W, split, (W - W * top) / 2, 0, W * top, split);
    x.drawImage(off, 0, split, W, d.height - split, (W - W * ft) / 2, split, W * ft, d.height - split);
  } else x.drawImage(off, 0, 0);
  drawOverlays(x, asset, config, meta);
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
  asset: assetOverride,
  fallback,
}: {
  config: SuitConfig;
  view?: PhotoView;
  className?: string;
  title?: string;
  fit?: "contain" | "width";
  crop?: Crop;
  /** Show this photo instead of the one the view would choose (Detail close-ups). */
  asset?: string | null;
  fallback: React.ReactNode;
}) {
  const asset = (assetOverride && assetOverride in ASSETS ? assetOverride : null) ?? choosePhoto(config, view);
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const trouserDetail = !!asset && /^detail-(waist|fastening|braces|pleats|side|back|hem|break)/.test(asset);
  const waistcoatPhoto = view === "waistcoat" || view === "nojacket" || (!!asset && asset.startsWith("wc-"));
  const fabric = trouserDetail ? (config.trouserFabric ?? config.fabric) : waistcoatPhoto ? (config.waistcoatFabric ?? config.fabric) : config.fabric;
  const trousers = view === "waistcoat" ? fabric : (config.trouserFabric ?? config.fabric);
  const liningMode = config.options["accents.liningStyle"] ?? "full";
  const overlayKey = JSON.stringify([config.options["accents.pocketSquare"], config.options["accents.buttonholes"], config.thread, config.options["accents.monogram"], config.monogram, config.options["accents.elbowPatches"], config.options["jacket.fit"], config.options["trousers.fit"], config.options["jacket.breastPocket"], config.options["accents.necktie"], config.options["accents.bowtie"], config.options["accents.underCollar"]]);
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const custom = config.options["accents.liningColour"] === "custom" && config.options["accents.liningStyle"] !== "unlined";
  const linHex = (custom ? LINING_COLOURS.find((l) => l.id === config.lining)?.hex : null) ?? shadeHex(getFabric(config.fabric)?.hex ?? "#1a2440", -0.3);
  const btn = config.options["accents.buttons"];
  const btnHex = btn && btn !== "matched" ? (BUTTON_HEX[btn] ?? null) : null;

  const cropped = crop ? 1 : 0;
  useEffect(() => {
    if (!asset) return;
    let off = false;
    render(asset, fabric, linHex, trousers, btnHex, asset === "inside" ? liningMode : "full")
      .then((d) => {
        const c = ref.current;
        if (off || !c) return;
        paint(c, d, asset, cfgRef.current);
        setState("ready");
      })
      .catch(() => !off && setState("error"));
    return () => {
      off = true;
    };
  }, [asset, fabric, linHex, trousers, btnHex, cropped, liningMode, overlayKey]);

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
