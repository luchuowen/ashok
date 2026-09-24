"use client";

import { useId } from "react";
import { BUTTON_HEX, FELT_COLOURS, LINING_COLOURS, MONOGRAM_FONTS, THREAD_COLOURS, getFabric, getOptionValue } from "@/lib/suit/catalogue";
import type { SuitConfig, SuitFabric } from "@/lib/suit/types";
import { luminance, mix, shade } from "./color";
import { LiningPattern } from "./patterns";

export type PreviewView = "front" | "back" | "lining" | "waistcoat";

/**
 * Photo-style flat-lay of the configured suit, laid out like a product shot:
 * the jacket large, the trousers folded beneath it. Every option that
 * changes the garment is drawn parametrically, then lit — woven cloth
 * textures (public/textures/fabrics, from scripts/generate-fabric-textures.py),
 * soft inner shadows, cast shadows under lapels, flaps and sleeves, fold
 * creases and a satin-sheen lining — so it reads as a real garment rather
 * than a technical flat. Pure function of props: the stage, the zoom view,
 * bag thumbnails and saved designs all render the same component.
 */
export function SuitPreview({
  config,
  view = "front",
  className = "",
  title,
  uid,
  hideJacket = false,
}: {
  config: SuitConfig;
  view?: PreviewView;
  className?: string;
  title?: string;
  /** Explicit id prefix — only needed when rendering outside one React root. */
  uid?: string;
  /** Show what's under the jacket: shirt (and waistcoat on a three-piece) over the trousers. */
  hideJacket?: boolean;
}) {
  const autoId = useId();
  const rid = (uid ?? autoId).replace(/[^a-zA-Z0-9]/g, "");
  const id = (s: string) => `${rid}-${s}`;
  const o = config.options;
  const three = o["suit.pieces"] === "three";
  const v: PreviewView = view === "waistcoat" && !three ? "front" : view;

  const jf = getFabric(config.fabric) ?? getFabric("house-navy-stretch")!;
  const tf = getFabric(config.trouserFabric ?? config.fabric) ?? jf;
  const wf = getFabric(config.waistcoatFabric ?? config.fabric) ?? jf;
  const liningColour =
    o["accents.liningColour"] === "custom" && o["accents.liningStyle"] !== "unlined"
      ? LINING_COLOURS.find((l) => l.id === config.lining) ?? LINING_COLOURS[0]!
      : houseLining(jf);
  const thread = THREAD_COLOURS.find((t) => t.id === config.thread)?.hex ?? "#8a4432";
  const holes = o["accents.buttonholes"] ?? "matched";
  const light = luminance(jf.hex) > 0.4;
  const matchedThread = shade(jf.hex, light ? -0.28 : 0.16);
  const buttonHex = BUTTON_HEX[o["accents.buttons"] ?? "matched"] ?? shade(jf.hex, light ? -0.42 : -0.5);

  const ctx: Ctx = {
    id,
    o,
    config,
    jf,
    tf,
    wf,
    light,
    edge: light ? "rgba(45,35,25,0.38)" : "rgba(0,0,0,0.45)",
    stitch: light ? "rgba(45,35,25,0.22)" : "rgba(255,255,255,0.10)",
    buttonHex,
    metal: o["accents.buttons"] === "gold" || o["accents.buttons"] === "silver",
    lapelThread: holes === "lapel" || holes === "all" ? thread : matchedThread,
    cuffThread: holes === "cuffs" || holes === "all" ? thread : matchedThread,
    frontThread: holes === "all" ? thread : matchedThread,
    satin: o["jacket.lapelFacing"] === "satin",
    pick: o["accents.pickStitch"] === "yes",
    pickThread: shade(jf.hex, light ? -0.35 : 0.32),
    lining: `url(#${id("lining")})`,
    texJ: `url(#${id("texJ")})`,
    texT: `url(#${id("texT")})`,
    texW: `url(#${id("texW")})`,
    satinFill: `url(#${id("satin")})`,
  };

  return (
    <svg viewBox="0 0 400 660" className={className} role="img" aria-label={title ?? "Preview of your custom suit"} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Cloth: jacket/waistcoat patterns live in the scaled garment space, trousers in page space. */}
        <Texture id={id("texJ")} fabric={jf} size={30} />
        <Texture id={id("texW")} fabric={wf} size={30} />
        <Texture id={id("texT")} fabric={tf} size={46} />
        <LiningPattern id={id("lining")} colour={liningColour} />
        <linearGradient id={id("satin")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mix(jf.hex, "#000", 0.25)} />
          <stop offset="0.45" stopColor={mix(jf.hex, "#fff", light ? 0.05 : 0.14)} />
          <stop offset="1" stopColor={mix(jf.hex, "#000", 0.4)} />
        </linearGradient>
        <filter id={id("b1")} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id={id("b2")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={id("b4")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={id("b8")} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={id("ground")} x="-10%" y="-10%" width="120%" height="125%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dy="5" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Key light from the upper left, falling off to the lower right. */}
        <linearGradient id={id("key")} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={id("side")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.10" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={id("sleeveL")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.30" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.30" />
        </linearGradient>
        <linearGradient id={id("sleeveR")} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.34" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.30" />
        </linearGradient>
        <linearGradient id={id("lapelL")} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.10" />
        </linearGradient>
        <linearGradient id={id("lapelR")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.26" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={id("inside")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.62" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("trouserKey")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={id("button")} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity={ctx.metal ? 0.75 : 0.28} />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <filter id={id("cloth")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.016" numOctaves="2" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.1 -0.035" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <g filter={`url(#${id("ground")})`}>
        <g transform="translate(200 26) scale(1.52) translate(-200 -34)">
          {hideJacket ? (
            <g>
              <Shirt ctx={ctx} back={v === "back"} />
              {three && v !== "back" ? <Waistcoat ctx={ctx} overShirt /> : null}
            </g>
          ) : v === "waistcoat" ? <Waistcoat ctx={ctx} /> : v === "back" ? <JacketBack ctx={ctx} /> : v === "lining" ? <JacketInside ctx={ctx} /> : <JacketFront ctx={ctx} />}
        </g>
        <FoldedTrousers ctx={ctx} back={v === "back"} />
      </g>
    </svg>
  );
}

function houseLining(f: SuitFabric) {
  const hex = luminance(f.hex) > 0.4 ? shade(f.hex, -0.18) : mix(f.hex, "#000", 0.25);
  return { id: "house", name: "House", hex };
}

function Texture({ id, fabric, size }: { id: string; fabric: SuitFabric; size: number }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
      <rect width={size} height={size} fill={fabric.hex} />
      <image href={`/textures/fabrics/${fabric.id}.jpg`} width={size} height={size} preserveAspectRatio="none" />
    </pattern>
  );
}

interface Ctx {
  id: (s: string) => string;
  o: Record<string, string>;
  config: SuitConfig;
  jf: SuitFabric;
  tf: SuitFabric;
  wf: SuitFabric;
  light: boolean;
  edge: string;
  stitch: string;
  buttonHex: string;
  metal: boolean;
  lapelThread: string;
  cuffThread: string;
  frontThread: string;
  satin: boolean;
  pick: boolean;
  pickThread: string;
  lining: string;
  texJ: string;
  texT: string;
  texW: string;
  satinFill: string;
}

/* ==================================================================== */
/* Garment geometry (jacket space: centre x 200, collar ~y 34, hem ~y 318) */
/* ==================================================================== */

const CX = 200;
const NECK_Y = 36;
const NECK_W = 19;
const HEM_Y = 318;

function dims(o: Record<string, string>) {
  const fit = o["jacket.fit"];
  const f = fit === "slim" ? { chest: 86, waist: 72, hip: 76 } : fit === "relaxed" ? { chest: 92, waist: 82, hip: 84 } : { chest: 89, waist: 77, hip: 80 };
  const sy = o["jacket.shoulder"] === "natural" ? 58 : 54;
  return { ...f, sy, shoulder: 90 };
}

/** One half of the body (d = +1 viewer-right, −1 viewer-left), running to the centre line. */
function halfBody(d: number, o: Record<string, string>, straightFront: boolean) {
  const g = dims(o);
  const x = (v: number) => CX + d * v;
  const quarter = straightFront
    ? `L${x(g.hip - 2)} ${HEM_Y - 2} Q${x(g.hip - 4)} ${HEM_Y + 2} ${x(g.hip - 12)} ${HEM_Y + 2} L${x(0)} ${HEM_Y + 2}`
    : `Q${x(g.hip - 6)} ${HEM_Y + 4} ${x(40)} ${HEM_Y + 4} L${x(0)} ${HEM_Y + 4}`;
  return [
    `M${x(NECK_W)} ${NECK_Y - 2}`,
    `Q${x(52)} ${g.sy - 12} ${x(g.shoulder)} ${g.sy}`,
    `Q${x(g.chest + 3)} ${g.sy + 34} ${x(g.chest)} 128`,
    `C${x(g.chest - 3)} 160 ${x(g.waist)} 180 ${x(g.waist)} 204`,
    `C${x(g.waist)} 240 ${x(g.hip)} 270 ${x(g.hip)} ${HEM_Y - 14}`,
    quarter,
    `L${x(0)} ${NECK_Y}`,
    "Z",
  ].join(" ");
}

function sleevePath(d: number, o: Record<string, string>) {
  const g = dims(o);
  const x = (v: number) => CX + d * v;
  const w = g.chest - 89;
  return [
    `M${x(g.shoulder - 1)} ${g.sy - 1}`,
    `C${x(g.shoulder + 12 + w)} ${g.sy + 4} ${x(g.shoulder + 16 + w)} ${g.sy + 60} ${x(g.shoulder + 17 + w)} 298`,
    `Q${x(g.shoulder + 1 + w)} 303 ${x(g.shoulder - 16 + w)} 302`,
    `C${x(g.shoulder - 15 + w)} 250 ${x(g.shoulder - 12)} 180 ${x(g.chest - 5)} 128`,
    `Q${x(g.shoulder - 3)} ${g.sy + 24} ${x(g.shoulder - 1)} ${g.sy - 1}`,
    "Z",
  ].join(" ");
}

type Closure = "sb1" | "sb2" | "sb3" | "db4" | "db6" | "mandarin";

function closureLayout(c: Closure) {
  switch (c) {
    case "sb1":
      return { ax: CX, ay: 200, buttons: [[CX, 200]] as [number, number][], db: false };
    case "sb3":
      return { ax: CX, ay: 192, buttons: [[CX + 3, 158], [CX, 194], [CX, 232]] as [number, number][], db: false };
    case "db4":
      return { ax: 180, ay: 182, buttons: [[CX - 19, 198], [CX + 19, 198], [CX - 19, 238], [CX + 19, 238]] as [number, number][], db: true };
    case "db6":
      return { ax: 178, ay: 180, buttons: [[CX - 26, 158], [CX + 26, 158], [CX - 19, 198], [CX + 19, 198], [CX - 19, 238], [CX + 19, 238]] as [number, number][], db: true };
    case "mandarin":
      return { ax: CX, ay: 42, buttons: [62, 100, 138, 176, 214].map((y) => [CX, y]) as [number, number][], db: false };
    case "sb2":
    default:
      return { ax: CX, ay: 186, buttons: [[CX, 186], [CX, 226]] as [number, number][], db: false };
  }
}

const LAPEL_W: Record<string, number> = { slim: 14, standard: 19, wide: 25 };

function lapelShapes(d: number, A: [number, number], style: string, widthKey: string, db: boolean) {
  const N: [number, number] = [CX + d * (NECK_W - 1), NECK_Y];
  const lw = LAPEL_W[widthKey] ?? 19;
  const rollX = (y: number) => A[0] + ((N[0] - A[0]) * (A[1] - y)) / (A[1] - N[1]);
  const gy = db ? 76 : 72;
  const G: [number, number] = [rollX(gy + 5), gy + 5];
  if (style === "shawl") {
    const tipX = rollX(110) + d * (lw + 4);
    const edge = `M${A[0]} ${A[1]} C${A[0] + d * lw * 0.9} ${A[1] - 34} ${tipX} 140 ${tipX} 108 C${tipX} 72 ${N[0] + d * 20} 46 ${N[0] + d * 9} 28`;
    return { lapel: `${edge} L${N[0]} ${N[1]} Z`, collar: null as string | null, edge, hole: [rollX(108) + d * lw * 0.62, 110] as [number, number] };
  }
  let T: [number, number];
  let Q: [number, number];
  let C: [number, number];
  if (style === "peak") {
    T = [rollX(gy) + d * (lw + 11), gy - 10];
    Q = [T[0] - d * lw * 0.62, gy + 6];
    C = [Q[0] - d * 2, gy - 6];
  } else {
    T = [rollX(gy + 11) + d * lw, gy + 11];
    Q = [T[0] - d * lw * 0.42, gy + 2];
    C = [T[0] - d * 1.5, gy - 8];
  }
  const belly: [number, number] = [A[0] + d * lw * (db ? 1.05 : 0.78), (A[1] + T[1]) / 2 + 8];
  const edge = `M${A[0]} ${A[1]} Q${belly[0]} ${belly[1]} ${T[0]} ${T[1]} L${Q[0]} ${Q[1]}`;
  const lapel = `${edge} L${G[0]} ${G[1]} Z`;
  const collar = `M${Q[0]} ${Q[1]} L${C[0]} ${C[1]} Q${N[0] + d * 17} ${NECK_Y + 2} ${N[0] + d * 6} ${NECK_Y - 9} L${N[0] - d * 3} ${NECK_Y - 7} L${G[0]} ${G[1]} Z`;
  const hy = gy + 22;
  return { lapel, collar, edge, hole: [rollX(hy) + d * lw * 0.62, hy] as [number, number] };
}

/* ==================================================================== */
/* Lighting helpers                                                       */
/* ==================================================================== */

/** Soft shadow hugging the inside of a shape's edge — the main "volume" cue. */
function InnerShadow({ ctx, d, clip, width = 12, opacity = 0.35 }: { ctx: Ctx; d: string; clip: string; width?: number; opacity?: number }) {
  return (
    <g clipPath={`url(#${clip})`} pointerEvents="none">
      <path d={d} fill="none" stroke="#000" strokeWidth={width} opacity={opacity} filter={`url(#${ctx.id("b4")})`} />
    </g>
  );
}

/** Blurred copy of a shape offset down/right: a cast shadow onto what's beneath. */
function CastShadow({ ctx, d, dx = 1.2, dy = 2.2, opacity = 0.45, blur = "b2" }: { ctx: Ctx; d: string; dx?: number; dy?: number; opacity?: number; blur?: "b1" | "b2" | "b4" }) {
  return <path d={d} transform={`translate(${dx} ${dy})`} fill="#000" opacity={opacity} filter={`url(#${ctx.id(blur)})`} pointerEvents="none" />;
}

/**
 * A soft fold line. Built from stacked translucent strokes rather than a blur
 * filter: filters on thin or perfectly straight paths get clipped to their
 * (near-zero) bounding box, which shows up as hard bands when zoomed in.
 */
function Crease({ d, opacity = 0.22, width = 2.2, highlight = false }: { ctx?: Ctx; d: string; opacity?: number; width?: number; highlight?: boolean }) {
  const stroke = highlight ? "#fff" : "#000";
  return (
    <g fill="none" stroke={stroke} strokeLinecap="round" pointerEvents="none">
      <path d={d} strokeWidth={width * 4} opacity={opacity * 0.1} />
      <path d={d} strokeWidth={width * 3} opacity={opacity * 0.12} />
      <path d={d} strokeWidth={width * 2.1} opacity={opacity * 0.14} />
      <path d={d} strokeWidth={width * 1.3} opacity={opacity * 0.16} />
      <path d={d} strokeWidth={width * 0.6} opacity={opacity * 0.18} />
    </g>
  );
}

function Lit({ ctx, clip, children }: { ctx: Ctx; clip: string; children?: React.ReactNode }) {
  return (
    <g clipPath={`url(#${clip})`} pointerEvents="none">
      <rect x="0" y="0" width="400" height="660" fill={`url(#${ctx.id("key")})`} />
      <rect x="0" y="0" width="400" height="660" fill={`url(#${ctx.id("side")})`} />
      <rect x="0" y="0" width="400" height="660" filter={`url(#${ctx.id("cloth")})`} />
      {children}
    </g>
  );
}

function Button({ ctx, x, y, r = 4.4 }: { ctx: Ctx; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x + 0.5} cy={y + 0.9} r={r} fill="#000" opacity="0.35" filter={`url(#${ctx.id("b1")})`} />
      <circle cx={x} cy={y} r={r} fill={ctx.buttonHex} />
      <circle cx={x} cy={y} r={r * 0.78} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={r * 0.12} />
      <circle cx={x} cy={y} r={r} fill={`url(#${ctx.id("button")})`} />
      {!ctx.metal && r > 2.6 ? (
        <g fill="rgba(0,0,0,0.55)">
          <circle cx={x - r * 0.26} cy={y - r * 0.26} r={r * 0.12} />
          <circle cx={x + r * 0.26} cy={y - r * 0.26} r={r * 0.12} />
          <circle cx={x - r * 0.26} cy={y + r * 0.26} r={r * 0.12} />
          <circle cx={x + r * 0.26} cy={y + r * 0.26} r={r * 0.12} />
        </g>
      ) : null}
    </g>
  );
}

/* ==================================================================== */
/* Parts                                                                  */
/* ==================================================================== */

function Sleeve({ ctx, d, back = false }: { ctx: Ctx; d: number; back?: boolean }) {
  const o = ctx.o;
  const path = sleevePath(d, o);
  const clip = ctx.id(`sl${d}${back ? "b" : ""}`);
  const g = dims(o);
  const w = g.chest - 89;
  const elbow = getOptionValue("accents.elbowPatches", o["accents.elbowPatches"] ?? "none");
  const n = Number(o["jacket.sleeveButtons"] ?? 4);
  const x = (v: number) => CX + d * v;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={path} />
        </clipPath>
      </defs>
      <CastShadow ctx={ctx} d={path} dx={-d * 2.5} dy={2} opacity={0.35} blur="b4" />
      <path d={path} fill={ctx.texJ} />
      <g clipPath={`url(#${clip})`} pointerEvents="none">
        <rect x="0" y="0" width="400" height="660" fill={`url(#${ctx.id(d === 1 ? "sleeveR" : "sleeveL")})`} />
        <rect x="0" y="0" width="400" height="660" fill={`url(#${ctx.id("key")})`} />
        <rect x="0" y="0" width="400" height="660" filter={`url(#${ctx.id("cloth")})`} />
        <Crease ctx={ctx} d={`M${x(g.shoulder + 3)} 186 Q${x(g.shoulder + 8 + w)} 192 ${x(g.shoulder + 14 + w)} 186`} opacity={0.28} />
        <Crease ctx={ctx} d={`M${x(g.shoulder + 1)} 196 Q${x(g.shoulder + 7 + w)} 200 ${x(g.shoulder + 12 + w)} 197`} opacity={0.16} highlight />
        <Crease ctx={ctx} d={`M${x(g.shoulder - 4)} 250 L${x(g.shoulder + 10 + w)} 258`} opacity={0.14} />
        <Crease ctx={ctx} d={`M${x(g.shoulder - 13 + w)} 286 L${x(g.shoulder + 16 + w)} 284`} opacity={0.2} width={3} />
      </g>
      <InnerShadow ctx={ctx} d={path} clip={clip} width={9} opacity={0.4} />
      <path d={path} fill="none" stroke={ctx.edge} strokeWidth="0.45" />
      {o["jacket.shoulder"] === "roped" ? <Crease ctx={ctx} d={`M${x(g.shoulder - 4)} ${g.sy - 1} Q${x(g.shoulder + 4)} ${g.sy - 5} ${x(g.shoulder + 11)} ${g.sy + 5}`} opacity={0.35} width={1.6} /> : null}
      {elbow?.hex && back ? (
        <g>
          <ellipse cx={x(g.shoulder + 6 + w)} cy={192} rx={7} ry={16} fill="#000" opacity="0.3" filter={`url(#${ctx.id("b1")})`} transform="translate(0.8 1.2)" />
          <ellipse cx={x(g.shoulder + 6 + w)} cy={192} rx={7} ry={16} fill={elbow.hex} />
          <ellipse cx={x(g.shoulder + 6 + w)} cy={192} rx={6} ry={15} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" strokeDasharray="0.8 1" />
        </g>
      ) : null}
      {Array.from({ length: n }).map((_, i) => {
        const bx = x(g.shoulder + 13 + w - i * 0.7);
        const by = 293 - i * 5.2;
        return (
          <g key={i}>
            <line x1={bx - d * 1} y1={by} x2={bx - d * 5.5} y2={by - 0.3} stroke={ctx.cuffThread} strokeWidth="0.9" strokeLinecap="round" />
            <Button ctx={ctx} x={bx} y={by} r={2.1} />
          </g>
        );
      })}
    </g>
  );
}

function FrontPockets({ ctx }: { ctx: Ctx }) {
  const o = ctx.o;
  const style = o["jacket.pockets"];
  if (style === "none") return null;
  const slant = style !== "patch" && o["jacket.pocketSlant"] === "slanted";
  const ticket = o["jacket.ticketPocket"] === "ticket";
  const pocket = (d: number, cy: number, w: number, small: boolean, key: string) => {
    const cx = CX + d * (small ? 50 : 52);
    const rot = slant ? d * 7 : d * -1.5;
    if (style === "patch") {
      const h = small ? 16 : 38;
      const top = cy - (small ? 4 : 10);
      const p = `M${cx - w / 2} ${top} L${cx + w / 2} ${top} L${cx + w / 2} ${top + h - 5} Q${cx + w / 2} ${top + h} ${cx + w / 2 - 5} ${top + h} L${cx - w / 2 + 5} ${top + h} Q${cx - w / 2} ${top + h} ${cx - w / 2} ${top + h - 5} Z`;
      return (
        <g key={key}>
          <CastShadow ctx={ctx} d={p} dx={0.6} dy={1.2} opacity={0.35} blur="b1" />
          <path d={p} fill={ctx.texJ} />
          <path d={p} fill={`url(#${ctx.id("key")})`} />
          <path d={p} fill="none" stroke={ctx.edge} strokeWidth="0.45" />
          <path d={`M${cx - w / 2 + 2} ${top + 2.5} L${cx + w / 2 - 2} ${top + 2.5}`} stroke={ctx.stitch} strokeWidth="0.5" strokeDasharray="1.2 1.2" />
        </g>
      );
    }
    if (style === "jetted") {
      return (
        <g key={key} transform={`rotate(${rot} ${cx} ${cy})`}>
          <rect x={cx - w / 2} y={cy - 2} width={w} height={4} fill={ctx.texJ} />
          <line x1={cx - w / 2} y1={cy} x2={cx + w / 2} y2={cy} stroke="#000" strokeOpacity="0.55" strokeWidth="0.7" />
          <line x1={cx - w / 2} y1={cy - 2} x2={cx + w / 2} y2={cy - 2} stroke="#fff" strokeOpacity="0.12" strokeWidth="0.5" />
          <line x1={cx - w / 2} y1={cy + 2} x2={cx + w / 2} y2={cy + 2} stroke="#000" strokeOpacity="0.25" strokeWidth="0.6" />
        </g>
      );
    }
    const h = small ? 9 : 13;
    const flap = `M${cx - w / 2} ${cy} L${cx + w / 2} ${cy} L${cx + w / 2 + (slant ? 0 : 0.8)} ${cy + h - 2} Q${cx + w / 2} ${cy + h} ${cx + w / 2 - 2} ${cy + h} L${cx - w / 2 + 2} ${cy + h} Q${cx - w / 2} ${cy + h} ${cx - w / 2 - 0.8} ${cy + h - 2} Z`;
    return (
      <g key={key} transform={`rotate(${rot} ${cx} ${cy})`}>
        <line x1={cx - w / 2 - 1} y1={cy - 0.8} x2={cx + w / 2 + 1} y2={cy - 0.8} stroke="#000" strokeOpacity="0.45" strokeWidth="0.8" />
        <CastShadow ctx={ctx} d={flap} dx={0.4} dy={1.8} opacity={0.5} blur="b1" />
        <path d={flap} fill={ctx.texJ} />
        <path d={flap} fill={`url(#${ctx.id("key")})`} />
        <line x1={cx - w / 2} y1={cy + 0.5} x2={cx + w / 2} y2={cy + 0.5} stroke="#fff" strokeOpacity="0.18" strokeWidth="0.6" />
        <path d={flap} fill="none" stroke={ctx.edge} strokeWidth="0.4" />
        {ctx.pick ? <path d={`M${cx - w / 2 + 2} ${cy + 2} L${cx - w / 2 + 2} ${cy + h - 2} L${cx + w / 2 - 2} ${cy + h - 2} L${cx + w / 2 - 2} ${cy + 2}`} fill="none" stroke={ctx.pickThread} strokeWidth="0.6" strokeDasharray="0.5 1.8" /> : null}
      </g>
    );
  };
  return (
    <g>
      {pocket(-1, 230, style === "patch" ? 42 : 38, false, "l")}
      {pocket(1, 230, style === "patch" ? 42 : 38, false, "r")}
      {ticket ? pocket(-1, 213, style === "patch" ? 30 : 27, true, "t") : null}
    </g>
  );
}

function BreastPocket({ ctx }: { ctx: Ctx }) {
  const o = ctx.o;
  const style = o["jacket.breastPocket"];
  const sq = getOptionValue("accents.pocketSquare", o["accents.pocketSquare"] ?? "none");
  const cx = CX + 49;
  const cy = 114;
  return (
    <g transform={`rotate(-4 ${cx} ${cy})`}>
      {style !== "none" && sq?.hex ? (
        <g>
          <path d={`M${cx - 10} ${cy + 1} L${cx - 8} ${cy - 7} L${cx - 3} ${cy - 3} L${cx + 1} ${cy - 9} L${cx + 5} ${cy - 4} L${cx + 10} ${cy - 7} L${cx + 11} ${cy + 1} Z`} fill={sq.hex} />
          <path d={`M${cx - 10} ${cy + 1} L${cx - 8} ${cy - 7} L${cx - 3} ${cy - 3} L${cx + 1} ${cy - 9} L${cx + 5} ${cy - 4} L${cx + 10} ${cy - 7} L${cx + 11} ${cy + 1} Z`} fill={`url(#${ctx.id("sheen")})`} />
        </g>
      ) : null}
      {style === "welt" ? (
        <g>
          <rect x={cx - 14} y={cy} width={28} height={6.5} fill="#000" opacity="0.35" filter={`url(#${ctx.id("b1")})`} transform="translate(0.4 1.2)" />
          <rect x={cx - 14} y={cy} width={28} height={6.5} fill={ctx.texJ} />
          <rect x={cx - 14} y={cy} width={28} height={6.5} fill={`url(#${ctx.id("key")})`} />
          <rect x={cx - 14} y={cy} width={28} height={6.5} fill="none" stroke={ctx.edge} strokeWidth="0.4" />
          <line x1={cx - 14} y1={cy + 0.4} x2={cx + 14} y2={cy + 0.4} stroke="#000" strokeOpacity="0.5" strokeWidth="0.6" />
        </g>
      ) : null}
      {style === "patch" ? (
        <g>
          <path d={`M${cx - 14} ${cy - 2} L${cx + 14} ${cy - 2} L${cx + 14} ${cy + 21} Q${cx + 14} ${cy + 25} ${cx + 10} ${cy + 25} L${cx - 10} ${cy + 25} Q${cx - 14} ${cy + 25} ${cx - 14} ${cy + 21} Z`} fill={ctx.texJ} stroke={ctx.edge} strokeWidth="0.45" />
          <line x1={cx - 12} y1={cy + 1} x2={cx + 12} y2={cy + 1} stroke={ctx.stitch} strokeWidth="0.5" strokeDasharray="1.2 1.2" />
        </g>
      ) : null}
    </g>
  );
}

function Neckwear({ ctx, apex, neckY, maxLen = 170 }: { ctx: Ctx; apex: [number, number]; neckY: number; maxLen?: number }) {
  const tie = getOptionValue("accents.necktie", ctx.o["accents.necktie"] ?? "none");
  const bow = getOptionValue("accents.bowtie", ctx.o["accents.bowtie"] ?? "none");
  const [ax, ay] = apex;
  if (tie?.hex) {
    const kY = neckY + 10;
    const end = Math.min(ay + 8, neckY + maxLen);
    const endX = CX + ((ax - CX) * (end - neckY)) / Math.max(1, ay - neckY);
    const blade = `M${CX - 3.8} ${kY + 6.5} L${CX + 3.8} ${kY + 6.5} L${endX + 6.5} ${end - 8} L${endX} ${end} L${endX - 6.5} ${end - 8} Z`;
    return (
      <g>
        <CastShadow ctx={ctx} d={blade} dx={0.6} dy={1} opacity={0.35} blur="b1" />
        <path d={blade} fill={tie.hex} />
        <path d={blade} fill={`url(#${ctx.id("sheen")})`} />
        <path d={`M${CX - 4.5} ${kY} L${CX + 4.5} ${kY} L${CX + 3.5} ${kY + 7} L${CX - 3.5} ${kY + 7} Z`} fill={shade(tie.hex, -0.15)} />
      </g>
    );
  }
  if (bow?.hex) {
    const y = neckY + 11;
    const p = `M${CX} ${y} L${CX - 11} ${y - 5} Q${CX - 13} ${y} ${CX - 11} ${y + 5} Z M${CX} ${y} L${CX + 11} ${y - 5} Q${CX + 13} ${y} ${CX + 11} ${y + 5} Z`;
    return (
      <g>
        <CastShadow ctx={ctx} d={p} dx={0.5} dy={1} opacity={0.35} blur="b1" />
        <path d={p} fill={bow.hex} />
        <path d={p} fill={`url(#${ctx.id("sheen")})`} />
        <rect x={CX - 2.2} y={y - 3} width="4.4" height="6" fill={shade(bow.hex, -0.2)} />
      </g>
    );
  }
  return null;
}

function hasNeckwear(o: Record<string, string>) {
  return (o["accents.necktie"] ?? "none") !== "none" || (o["accents.bowtie"] ?? "none") !== "none";
}

/** What shows inside the V: the jacket's lining and back collar (as in a product flat-lay), or a shirt when neckwear is chosen. */
function InsideV({ ctx, apex, neckTop }: { ctx: Ctx; apex: [number, number]; neckTop: number }) {
  const [ax, ay] = apex;
  const v = `M${CX - NECK_W - 1} ${neckTop} Q${CX} ${neckTop + 4} ${CX + NECK_W + 1} ${neckTop} L${ax} ${ay} Z`;
  if (ctx.o["suit.pieces"] === "three") {
    // Three-piece: shirt, tie, and the waistcoat showing in the opening.
    const vc = ctx.id("vclip");
    const wApex = ctx.o["waistcoat.style"] === "sb6" ? 118 : 130;
    const panels = `M${CX - 70} 40 L${CX - 24} 40 L${CX} ${wApex} L${CX + 24} 40 L${CX + 70} 40 L${CX + 70} 330 L${CX - 70} 330 Z`;
    const wButtons = (ctx.o["waistcoat.style"] === "sb6" ? [120, 148, 176, 204] : [132, 164, 196]).filter((y) => y < ay - 6);
    return (
      <g>
        <defs>
          <clipPath id={vc}>
            <path d={v} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${vc})`}>
          <path d={v} fill="#f5f3ee" />
          <Neckwear ctx={ctx} apex={[CX, wApex]} neckY={neckTop} />
          <CastShadow ctx={ctx} d={panels} dx={0} dy={2} opacity={0.4} blur="b2" />
          <path d={panels} fill={ctx.texW} />
          <path d={panels} fill={`url(#${ctx.id("inside")})`} opacity="0.35" />
          <path d={panels} fill="none" stroke={ctx.edge} strokeWidth="0.45" />
          {wButtons.map((y) => (
            <Button key={y} ctx={ctx} x={CX} y={y} r={3.2} />
          ))}
          <path d={v} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="5" filter={`url(#${ctx.id("b2")})`} />
        </g>
        <path d={`M${CX - NECK_W + 2} ${neckTop - 1} L${CX - 1.5} ${neckTop + 13} L${CX - 10} ${neckTop + 18} Z M${CX + NECK_W - 2} ${neckTop - 1} L${CX + 1.5} ${neckTop + 13} L${CX + 10} ${neckTop + 18} Z`} fill="#fbfaf7" stroke="rgba(0,0,0,0.18)" strokeWidth="0.4" />
      </g>
    );
  }
  if (hasNeckwear(ctx.o)) {
    return (
      <g>
        <path d={v} fill="#f5f3ee" />
        <path d={v} fill={`url(#${ctx.id("key")})`} />
        <path d={`M${CX - NECK_W + 2} ${neckTop - 1} L${CX - 1.5} ${neckTop + 13} L${CX - 10} ${neckTop + 18} Z M${CX + NECK_W - 2} ${neckTop - 1} L${CX + 1.5} ${neckTop + 13} L${CX + 10} ${neckTop + 18} Z`} fill="#fbfaf7" stroke="rgba(0,0,0,0.18)" strokeWidth="0.4" />
        <Neckwear ctx={ctx} apex={apex} neckY={neckTop} />
      </g>
    );
  }
  return (
    <g>
      <path d={v} fill={ctx.lining} />
      <path d={v} fill={`url(#${ctx.id("inside")})`} />
      <path d={`M${CX - 7} ${neckTop + 6} Q${CX - 2} ${neckTop + 40} ${CX - 9} ${ay - 30}`} fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="5" filter={`url(#${ctx.id("b2")})`} />
      <path d={`M${CX + 6} ${neckTop + 10} Q${CX + 3} ${neckTop + 50} ${CX + 5} ${ay - 40}`} fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="4" filter={`url(#${ctx.id("b2")})`} />
      <line x1={CX} y1={neckTop + 6} x2={ax} y2={ay - 6} stroke="#000" strokeOpacity="0.35" strokeWidth="0.6" />
      {/* inside back collar + hanger tape */}
      <path d={`M${CX - NECK_W - 1} ${neckTop} Q${CX} ${neckTop + 4} ${CX + NECK_W + 1} ${neckTop} L${CX + NECK_W - 1} ${neckTop + 7} Q${CX} ${neckTop + 10} ${CX - NECK_W + 1} ${neckTop + 7} Z`} fill={ctx.texJ} />
      <path d={`M${CX - NECK_W - 1} ${neckTop} Q${CX} ${neckTop + 4} ${CX + NECK_W + 1} ${neckTop} L${CX + NECK_W - 1} ${neckTop + 7} Q${CX} ${neckTop + 10} ${CX - NECK_W + 1} ${neckTop + 7} Z`} fill="#000" opacity="0.28" />
      <rect x={CX - 7} y={neckTop + 3.2} width="14" height="2" rx="0.8" fill="#000" opacity="0.45" />
    </g>
  );
}

/* ==================================================================== */
/* Jacket views                                                          */
/* ==================================================================== */

function JacketFront({ ctx }: { ctx: Ctx }) {
  const o = ctx.o;
  const closure = (o["jacket.closure"] ?? "sb2") as Closure;
  const L0 = closureLayout(closure);
  const mandarin = closure === "mandarin";
  const A: [number, number] = [L0.ax, L0.ay];
  const lowest = Math.max(...L0.buttons.map((b) => b[1]));
  const clip = ctx.id("jf");
  const bodyL = halfBody(-1, o, L0.db || mandarin);
  const bodyR = halfBody(1, o, L0.db || mandarin);
  const lapelStyle = o["jacket.lapel"] ?? "notch";
  const lapelW = o["jacket.lapelWidth"] ?? "standard";
  const Lp = mandarin ? null : lapelShapes(-1, A, lapelStyle, lapelW, L0.db);
  const Rp = mandarin ? null : lapelShapes(1, A, lapelStyle, lapelW, L0.db);
  const mono = ctx.config.monogram?.placement === "cuff" ? ctx.config.monogram : null;
  const cut = `M${CX} ${lowest + 7} Q${CX + 1} ${HEM_Y - 22} ${CX + 34} ${HEM_Y + 5} L${CX - 34} ${HEM_Y + 5} Q${CX - 1} ${HEM_Y - 22} ${CX} ${lowest + 7} Z`;

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={bodyL} />
          <path d={bodyR} />
        </clipPath>
      </defs>
      {/* Body */}
      <path d={bodyL} fill={ctx.texJ} />
      <path d={bodyR} fill={ctx.texJ} />
      <Lit ctx={ctx} clip={clip}>
        <ellipse cx={CX - 48} cy={112} rx={28} ry={40} fill="#fff" opacity="0.06" filter={`url(#${ctx.id("b8")})`} />
        <ellipse cx={CX + 48} cy={112} rx={28} ry={40} fill="#fff" opacity="0.04" filter={`url(#${ctx.id("b8")})`} />
        <Crease ctx={ctx} d={`M${CX - 30} 58 Q${CX - 60} 66 ${CX - 84} 60`} opacity={0.12} highlight width={4} />
        <Crease ctx={ctx} d={`M${CX + 30} 58 Q${CX + 60} 66 ${CX + 84} 60`} opacity={0.1} highlight width={4} />
        <Crease ctx={ctx} d={`M${CX - 72} 186 Q${CX - 64} 206 ${CX - 66} 232`} opacity={0.14} width={4} />
        <Crease ctx={ctx} d={`M${CX + 72} 186 Q${CX + 64} 206 ${CX + 66} 232`} opacity={0.18} width={4} />
        {/* front darts */}
        <path d={`M${CX - 44} 152 Q${CX - 42} 196 ${CX - 44} 226`} fill="none" stroke={ctx.stitch} strokeWidth="0.5" />
        <path d={`M${CX + 44} 152 Q${CX + 42} 196 ${CX + 44} 226`} fill="none" stroke={ctx.stitch} strokeWidth="0.5" />
      </Lit>
      <InnerShadow ctx={ctx} d={`${bodyL} ${bodyR}`} clip={clip} width={14} opacity={0.3} />

      {/* Opening: lining/shirt in the V, lining in the cutaway, front edges */}
      {mandarin ? (
        <g>
          <Crease ctx={ctx} d={`M${CX + 1.5} ${NECK_Y + 4} L${CX + 1.5} ${HEM_Y}`} opacity={0.4} width={2} />
          <line x1={CX} y1={NECK_Y + 2} x2={CX} y2={HEM_Y + 2} stroke={ctx.edge} strokeWidth="0.6" />
          <path d={`M${CX - NECK_W - 3} ${NECK_Y - 1} Q${CX} ${NECK_Y + 6} ${CX + NECK_W + 3} ${NECK_Y - 1} L${CX + NECK_W + 1} ${NECK_Y - 12} Q${CX} ${NECK_Y - 7} ${CX - NECK_W - 1} ${NECK_Y - 12} Z`} fill={ctx.satin ? ctx.satinFill : ctx.texJ} stroke={ctx.edge} strokeWidth="0.5" />
          <path d={`M${CX - NECK_W - 1} ${NECK_Y - 12} Q${CX} ${NECK_Y - 20} ${CX + NECK_W + 1} ${NECK_Y - 12} Q${CX} ${NECK_Y - 7} ${CX - NECK_W - 1} ${NECK_Y - 12} Z`} fill={ctx.lining} />
          <path d={`M${CX - NECK_W - 1} ${NECK_Y - 12} Q${CX} ${NECK_Y - 20} ${CX + NECK_W + 1} ${NECK_Y - 12} Q${CX} ${NECK_Y - 7} ${CX - NECK_W - 1} ${NECK_Y - 12} Z`} fill="#000" opacity="0.45" />
        </g>
      ) : (
        <g>
          <InsideV ctx={ctx} apex={A} neckTop={NECK_Y - 1} />
          {L0.db ? (
            <g>
              <Crease ctx={ctx} d={`M${A[0] + 2} ${A[1]} L${A[0] + 2} ${HEM_Y}`} opacity={0.45} width={2.2} />
              <line x1={A[0]} y1={A[1]} x2={A[0]} y2={HEM_Y + 2} stroke={ctx.edge} strokeWidth="0.6" />
            </g>
          ) : (
            <g>
              <defs>
                <clipPath id={ctx.id("cutclip")}>
                  <path d={cut} />
                </clipPath>
              </defs>
              <path d={cut} fill={ctx.lining} />
              <path d={cut} fill="#000" opacity="0.5" />
              {o["suit.pieces"] === "three" ? (
                <g clipPath={`url(#${ctx.id("cutclip")})`}>
                  <path d={`M${CX - 70} 200 L${CX + 70} 200 L${CX + 70} 262 L${CX + 12} 294 L${CX} 286 L${CX - 12} 294 L${CX - 70} 262 Z`} fill={ctx.texW} />
                  <path d={`M${CX - 70} 200 L${CX + 70} 200 L${CX + 70} 262 L${CX + 12} 294 L${CX} 286 L${CX - 12} 294 L${CX - 70} 262 Z`} fill="#000" opacity="0.2" stroke={ctx.edge} strokeWidth="0.5" />
                  <line x1={CX} y1={200} x2={CX} y2={286} stroke={ctx.edge} strokeWidth="0.5" />
                  {[260].map((y) => (
                    <Button key={y} ctx={ctx} x={CX} y={y} r={3.2} />
                  ))}
                </g>
              ) : null}
              <CastShadow ctx={ctx} d={`M${CX - 34} ${HEM_Y + 5} Q${CX - 1} ${HEM_Y - 22} ${CX} ${lowest + 7} L${CX - 3} ${lowest + 7} Q${CX - 4} ${HEM_Y - 22} ${CX - 36} ${HEM_Y + 5} Z`} dx={1.5} dy={0} opacity={0.6} blur="b1" />
              <path d={cut} fill="none" stroke={ctx.edge} strokeWidth="0.5" />
              <Crease ctx={ctx} d={`M${CX + 1.5} ${A[1]} L${CX + 1.5} ${lowest + 6}`} opacity={0.45} width={2} />
              <line x1={CX} y1={A[1]} x2={CX} y2={lowest + 7} stroke={ctx.edge} strokeWidth="0.6" />
            </g>
          )}
        </g>
      )}

      <FrontPockets ctx={ctx} />
      <BreastPocket ctx={ctx} />

      {/* Lapels and collar, lifted off the body with a cast shadow */}
      {Lp && Rp
        ? [Lp, Rp].map((s, i) => (
            <g key={i}>
              {s.collar ? (
                <g>
                  <CastShadow ctx={ctx} d={s.collar} dx={i ? 0.8 : -0.8} dy={1.4} opacity={0.4} blur="b1" />
                  <path d={s.collar} fill={ctx.texJ} />
                  <path d={s.collar} fill="#000" opacity="0.1" />
                  <path d={s.collar} fill="none" stroke={ctx.edge} strokeWidth="0.45" />
                </g>
              ) : null}
              <CastShadow ctx={ctx} d={s.lapel} dx={i ? 1.8 : -1.8} dy={2.2} opacity={0.5} blur="b2" />
              <path d={s.lapel} fill={ctx.satin ? ctx.satinFill : ctx.texJ} />
              <path d={s.lapel} fill={`url(#${ctx.id(i ? "lapelR" : "lapelL")})`} />
              <path d={s.lapel} fill={`url(#${ctx.id("key")})`} />
              <path d={s.edge} fill="none" stroke="#fff" strokeOpacity={ctx.satin ? 0.25 : 0.14} strokeWidth="0.7" transform={`translate(${i ? -0.5 : 0.5} 0.3)`} />
              <path d={s.lapel} fill="none" stroke={ctx.edge} strokeWidth="0.45" />
              {ctx.pick ? <path d={s.edge} fill="none" stroke={ctx.pickThread} strokeWidth="0.55" strokeDasharray="0.5 1.9" transform={`translate(${i ? -1.6 : 1.6} 0.6)`} /> : null}
            </g>
          ))
        : null}
      {Rp ? (
        <line x1={Rp.hole[0] - 4} y1={Rp.hole[1] - 1.2} x2={Rp.hole[0] + 4} y2={Rp.hole[1] + 1.2} stroke={ctx.lapelThread} strokeWidth="1.2" strokeLinecap="round" />
      ) : null}

      {L0.buttons.map(([x, y], i) => (
        <g key={i}>
          {!L0.db ? <line x1={x + 1.5} y1={y} x2={x + 10} y2={y} stroke={ctx.frontThread} strokeWidth="1.1" strokeLinecap="round" /> : null}
          <Button ctx={ctx} x={x} y={y} r={mandarin ? 3.6 : 4.3} />
        </g>
      ))}

      <Sleeve ctx={ctx} d={-1} />
      <Sleeve ctx={ctx} d={1} />
      {mono ? (
        <text x={CX - 96} y={282} fontSize="6" fill={THREAD_COLOURS.find((t) => t.id === mono.thread)?.hex} fontFamily={MONOGRAM_FONTS.find((f) => f.id === mono.font)?.css} textAnchor="middle" transform={`rotate(-84 ${CX - 96} 282)`}>
          {mono.text}
        </text>
      ) : null}
    </g>
  );
}

function JacketBack({ ctx }: { ctx: Ctx }) {
  const o = ctx.o;
  const g = dims(o);
  const clip = ctx.id("jb");
  const bodyL = halfBody(-1, o, true);
  const bodyR = halfBody(1, o, true);
  const vents = o["jacket.vents"];
  const felt = FELT_COLOURS.find((c) => c.id === o["accents.underCollar"]);
  const collar = `M${CX - 20} ${NECK_Y - 4} Q${CX} ${NECK_Y - 9} ${CX + 20} ${NECK_Y - 4} L${CX + 25} ${NECK_Y + 10} Q${CX} ${NECK_Y + 5} ${CX - 25} ${NECK_Y + 10} Z`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={bodyL} />
          <path d={bodyR} />
        </clipPath>
      </defs>
      <path d={bodyL} fill={ctx.texJ} />
      <path d={bodyR} fill={ctx.texJ} />
      <Lit ctx={ctx} clip={clip}>
        <ellipse cx={CX - 30} cy={100} rx={40} ry={45} fill="#fff" opacity="0.06" filter={`url(#${ctx.id("b8")})`} />
        <Crease ctx={ctx} d={`M${CX - 60} 140 Q${CX - 40} 150 ${CX - 20} 146`} opacity={0.12} />
        <Crease ctx={ctx} d={`M${CX + 60} 140 Q${CX + 40} 150 ${CX + 20} 146`} opacity={0.14} />
        <line x1={CX} y1={NECK_Y + 8} x2={CX} y2={vents === "centre" ? 248 : HEM_Y + 2} stroke="#000" strokeOpacity="0.4" strokeWidth="0.7" />
        <Crease ctx={ctx} d={`M${CX + 1.5} ${NECK_Y + 10} L${CX + 1.5} ${HEM_Y}`} opacity={0.2} />
        {[-1, 1].map((d) => (
          <path key={d} d={`M${CX + d * (g.chest - 14)} 132 C${CX + d * (g.waist - 12)} 190 ${CX + d * (g.waist - 10)} 240 ${CX + d * (g.hip - 10)} ${HEM_Y}`} fill="none" stroke={ctx.stitch} strokeWidth="0.6" />
        ))}
      </Lit>
      <InnerShadow ctx={ctx} d={`${bodyL} ${bodyR}`} clip={clip} width={14} opacity={0.3} />
      {vents === "centre" ? (
        <g>
          <CastShadow ctx={ctx} d={`M${CX} 248 L${CX + 5} 248 L${CX + 5} ${HEM_Y + 2} L${CX} ${HEM_Y + 2} Z`} dx={1} dy={0} opacity={0.4} blur="b1" />
          <line x1={CX} y1={248} x2={CX} y2={HEM_Y + 2} stroke={ctx.edge} strokeWidth="0.7" />
          <line x1={CX} y1={248} x2={CX + 4} y2={244} stroke={ctx.edge} strokeWidth="0.6" />
        </g>
      ) : null}
      {vents === "side"
        ? [-1, 1].map((d) => (
            <g key={d}>
              <CastShadow ctx={ctx} d={`M${CX + d * (g.hip - 10)} 250 L${CX + d * (g.hip - 6)} 250 L${CX + d * (g.hip - 6)} ${HEM_Y} L${CX + d * (g.hip - 10)} ${HEM_Y} Z`} dx={0} dy={0} opacity={0.35} blur="b1" />
              <line x1={CX + d * (g.hip - 10)} y1={250} x2={CX + d * (g.hip - 10)} y2={HEM_Y + 1} stroke={ctx.edge} strokeWidth="0.7" />
            </g>
          ))
        : null}
      <CastShadow ctx={ctx} d={collar} dx={0} dy={1.5} opacity={0.4} blur="b1" />
      <path d={collar} fill={ctx.texJ} />
      <path d={collar} fill={`url(#${ctx.id("key")})`} />
      {felt ? <path d={`M${CX - 24} ${NECK_Y + 7} Q${CX} ${NECK_Y + 2} ${CX + 24} ${NECK_Y + 7} L${CX + 25} ${NECK_Y + 10} Q${CX} ${NECK_Y + 5} ${CX - 25} ${NECK_Y + 10} Z`} fill={felt.hex} /> : null}
      <path d={collar} fill="none" stroke={ctx.edge} strokeWidth="0.45" />
      <Sleeve ctx={ctx} d={-1} back />
      <Sleeve ctx={ctx} d={1} back />
    </g>
  );
}

function JacketInside({ ctx }: { ctx: Ctx }) {
  const o = ctx.o;
  const g = dims(o);
  const clip = ctx.id("ji");
  const bodyL = halfBody(-1, o, true);
  const bodyR = halfBody(1, o, true);
  const style = o["accents.liningStyle"] ?? "full";
  const felt = FELT_COLOURS.find((c) => c.id === o["accents.underCollar"]);
  const mono = ctx.config.monogram;
  const monoFont = MONOGRAM_FONTS.find((f) => f.id === mono?.font)?.css;
  const monoHex = THREAD_COLOURS.find((t) => t.id === mono?.thread)?.hex ?? "#efe6d2";
  const facing = (d: number) => `M${CX + d * NECK_W} ${NECK_Y - 2} L${CX + d * 50} ${NECK_Y + 26} Q${CX + d * 54} 150 ${CX + d * 40} ${HEM_Y + 2} L${CX} ${HEM_Y + 4} L${CX} ${NECK_Y} Z`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={bodyL} />
          <path d={bodyR} />
        </clipPath>
      </defs>
      <path d={bodyL} fill={ctx.texJ} />
      <path d={bodyR} fill={ctx.texJ} />
      <g clipPath={`url(#${clip})`}>
        <rect width="400" height="660" fill="#000" opacity="0.15" />
        {style === "full" || style === "half" ? <rect width="400" height="660" fill={ctx.lining} /> : null}
        {style === "half" ? (
          <g>
            <path d={`M${CX - 90} 150 Q${CX} 186 ${CX + 90} 150 L${CX + 90} 330 L${CX - 90} 330 Z`} fill={ctx.texJ} />
            <path d={`M${CX - 90} 150 Q${CX} 186 ${CX + 90} 150`} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="0.8" />
          </g>
        ) : null}
        {style === "unlined" ? (
          <g>
            <path d={`M${CX - 96} 48 Q${CX} 86 ${CX + 96} 48 L${CX + 96} 20 L${CX - 96} 20 Z`} fill={ctx.lining} />
            {[-1, 1].map((d) => (
              <path key={d} d={`M${CX + d * (g.chest - 14)} 132 C${CX + d * (g.waist - 12)} 190 ${CX + d * (g.waist - 10)} 240 ${CX + d * (g.hip - 10)} ${HEM_Y}`} fill="none" stroke={ctx.lining} strokeWidth="3" />
            ))}
          </g>
        ) : null}
        <path d="M150 60 Q170 160 160 300" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="10" filter={`url(#${ctx.id("b4")})`} />
        <path d="M250 70 Q232 170 244 300" fill="none" stroke="#fff" strokeOpacity="0.09" strokeWidth="8" filter={`url(#${ctx.id("b4")})`} />
        {[-1, 1].map((d) => (
          <g key={d}>
            <CastShadow ctx={ctx} d={facing(d)} dx={d * 1.5} dy={0} opacity={0.45} blur="b2" />
            <path d={facing(d)} fill={ctx.texJ} />
            <path d={facing(d)} fill={`url(#${ctx.id("key")})`} />
          </g>
        ))}
        <rect width="400" height="660" fill={`url(#${ctx.id("side")})`} />
      </g>
      <InnerShadow ctx={ctx} d={`${bodyL} ${bodyR}`} clip={clip} width={14} opacity={0.35} />
      <line x1={CX} y1={NECK_Y} x2={CX} y2={HEM_Y + 3} stroke="#000" strokeOpacity="0.55" strokeWidth="1" />
      <path d={`M${CX - NECK_W - 2} ${NECK_Y} Q${CX} ${NECK_Y + 12} ${CX + NECK_W + 2} ${NECK_Y} L${CX + NECK_W} ${NECK_Y - 8} Q${CX} ${NECK_Y + 2} ${CX - NECK_W} ${NECK_Y - 8} Z`} fill={felt?.hex ?? mix(ctx.jf.hex, "#000", 0.2)} />
      <rect x={CX - 22} y={NECK_Y + 13} width="44" height="10" fill="#efe9dc" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />
      <text x={CX} y={NECK_Y + 20} fontSize="4.6" textAnchor="middle" fill="#14120f" fontFamily="var(--font-display), Georgia, serif" letterSpacing="0.4">
        ASHOK SUNNY
      </text>
      {[-1, 1].map((d) => (
        <g key={d}>
          <rect x={CX + d * 48 - (d === 1 ? 0 : 26)} y={148} width={26} height={4} fill={ctx.texJ} stroke="#000" strokeOpacity="0.45" strokeWidth="0.5" />
          <rect x={CX + d * 48 - (d === 1 ? 0 : 20)} y={228} width={20} height={3.5} fill={ctx.texJ} stroke="#000" strokeOpacity="0.4" strokeWidth="0.5" />
        </g>
      ))}
      {mono && mono.placement === "lining" ? (
        <text x={CX - 62} y={172} fontSize={mono.font === "script" ? 13 : 10} textAnchor="middle" fill={monoHex} fontFamily={monoFont} letterSpacing="1">
          {mono.text}
        </text>
      ) : null}
      {mono && mono.placement === "collar" ? (
        <text x={CX} y={NECK_Y + 4} fontSize="5" textAnchor="middle" fill={monoHex} fontFamily={monoFont}>
          {mono.text}
        </text>
      ) : null}
      <Sleeve ctx={ctx} d={-1} />
      <Sleeve ctx={ctx} d={1} />
    </g>
  );
}

/* ==================================================================== */
/* Waistcoat                                                              */
/* ==================================================================== */

function Waistcoat({ ctx, overShirt = false }: { ctx: Ctx; overShirt?: boolean }) {
  const o = ctx.o;
  const style = o["waistcoat.style"] ?? "sb5";
  const edge = o["waistcoat.edge"] ?? "pointed";
  const lapel = o["waistcoat.lapel"] ?? "none";
  const pockets = o["waistcoat.pockets"] ?? "welt";
  const db = style === "db6";
  const clip = ctx.id("wc");
  const top = 46;
  const apexY = style === "sb6" ? 118 : db ? 134 : 130;
  const apexX = db ? CX - 14 : CX;
  const bottom = edge === "pointed" ? 292 : 280;
  const half = (d: number) => {
    const x = (v: number) => CX + d * v;
    const hem = edge === "pointed" ? `L${x(74)} 262 L${x(12)} 294 L${x(0)} 286` : `L${x(74)} 278 L${x(9)} 280 L${x(0)} 284`;
    return `M${x(26)} ${top} L${x(50)} ${top + 4} Q${x(56)} ${top + 50} ${x(78)} ${top + 74} L${x(74)} 232 ${hem} L${x(0)} ${top + 2} Z`;
  };
  const buttons: [number, number][] = db
    ? [[CX - 16, 150], [CX + 16, 150], [CX - 16, 190], [CX + 16, 190], [CX - 16, 230], [CX + 16, 230]]
    : (style === "sb6" ? [120, 148, 176, 204, 232, 260] : [132, 164, 196, 228, 260]).map((y) => [CX, y]);
  const bodyL = half(-1);
  const bodyR = half(1);
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={bodyL} />
          <path d={bodyR} />
        </clipPath>
      </defs>
      {o["waistcoat.back"] === "fabric" ? null : (
        <path d={`M${CX - 80} ${top + 70} L${CX - 74} 232 L${CX - 60} 232 L${CX - 66} ${top + 70} Z M${CX + 80} ${top + 70} L${CX + 74} 232 L${CX + 60} 232 L${CX + 66} ${top + 70} Z`} fill={ctx.lining} opacity="0.9" />
      )}
      <path d={bodyL} fill={ctx.texW} />
      <path d={bodyR} fill={ctx.texW} />
      <Lit ctx={ctx} clip={clip}>
        <Crease ctx={ctx} d={`M${CX - 60} 200 Q${CX - 44} 210 ${CX - 40} 226`} opacity={0.18} />
        <Crease ctx={ctx} d={`M${CX + 60} 200 Q${CX + 44} 210 ${CX + 40} 226`} opacity={0.2} />
      </Lit>
      <InnerShadow ctx={ctx} d={`${bodyL} ${bodyR}`} clip={clip} width={12} opacity={0.32} />
      <path d={`${bodyL} ${bodyR}`} fill="none" stroke={ctx.edge} strokeWidth="0.45" />
      <path d={`M${CX - 26} ${top} L${CX + 26} ${top} L${apexX} ${apexY} Z`} fill="#f5f3ee" />
      {overShirt ? <path d={`M${CX - 26} ${top} L${CX + 26} ${top} L${apexX} ${apexY} Z`} fill={`url(#${ctx.id("key")})`} /> : null}
      <path d={`M${CX - 14} ${top - 6} L${CX} ${top + 12} L${CX + 14} ${top - 6} L${CX + 7} ${top - 11} L${CX - 7} ${top - 11} Z`} fill="#fbfaf6" stroke="rgba(0,0,0,0.2)" strokeWidth="0.4" />
      <Neckwear ctx={ctx} apex={[apexX, apexY]} neckY={top - 8} />
      <Crease ctx={ctx} d={`M${apexX + 1.5} ${apexY} L${apexX + 1.5} ${bottom - 6}`} opacity={0.35} width={1.8} />
      <line x1={apexX} y1={apexY} x2={apexX} y2={db ? bottom : bottom - 6} stroke={ctx.edge} strokeWidth="0.6" />
      {lapel !== "none"
        ? [-1, 1].map((d) => {
            const N: [number, number] = [CX + d * 26, top];
            const rollX = (y: number) => apexX + ((N[0] - apexX) * (apexY - y)) / (apexY - top);
            const w = 11;
            const path =
              lapel === "shawl"
                ? `M${apexX} ${apexY} Q${rollX(96) + d * (w + 4)} 96 ${N[0] + d * 7} ${top - 2} L${N[0]} ${N[1]} Z`
                : lapel === "peak"
                  ? `M${apexX} ${apexY} Q${rollX(88) + d * w} 92 ${rollX(72) + d * (w + 7)} 68 L${rollX(76) + d * 4} 78 L${rollX(76)} 76 Z`
                  : `M${apexX} ${apexY} Q${rollX(88) + d * w} 92 ${rollX(78) + d * w} 78 L${rollX(76) + d * 5} 74 L${rollX(76)} 76 Z`;
            return (
              <g key={d}>
                <CastShadow ctx={ctx} d={path} dx={d * 1.2} dy={1.6} opacity={0.4} blur="b1" />
                <path d={path} fill={ctx.texW} />
                <path d={path} fill={`url(#${ctx.id(d === 1 ? "lapelR" : "lapelL")})`} />
                <path d={path} fill="none" stroke={ctx.edge} strokeWidth="0.4" />
              </g>
            );
          })
        : null}
      {pockets !== "none"
        ? ([
            [-1, 122, 22],
            [1, 122, 22],
            [-1, 214, 26],
            [1, 214, 26],
          ] as const).map(([d, y, w], i) => (
            <g key={i} transform={`rotate(${d * -4} ${CX + d * 44} ${y})`}>
              <rect x={CX + d * 44 - w / 2} y={y + 1} width={w} height={pockets === "jetted" ? 4 : 5} fill="#000" opacity="0.3" filter={`url(#${ctx.id("b1")})`} />
              <rect x={CX + d * 44 - w / 2} y={y} width={w} height={pockets === "jetted" ? 4 : 5} fill={ctx.texW} stroke={ctx.edge} strokeWidth="0.4" />
              {pockets === "jetted" ? <line x1={CX + d * 44 - w / 2} y1={y + 2} x2={CX + d * 44 + w / 2} y2={y + 2} stroke="#000" strokeOpacity="0.5" strokeWidth="0.5" /> : null}
            </g>
          ))
        : null}
      {buttons.map(([x, y], i) => (
        <Button key={i} ctx={ctx} x={x} y={y} r={3.6} />
      ))}
    </g>
  );
}

/* ==================================================================== */
/* Shirt (shown when the jacket is hidden)                                */
/* ==================================================================== */

const SHIRT = "#f6f4ef";

function Shirt({ ctx, back = false }: { ctx: Ctx; back?: boolean }) {
  const o = ctx.o;
  const three = o["suit.pieces"] === "three";
  const g = dims(o);
  const clip = ctx.id(back ? "shb" : "shf");
  const chest = g.chest - 12;
  const waist = g.waist - 7;
  const sh = g.shoulder - 11;
  const half = (d: number) => {
    const x = (v: number) => CX + d * v;
    return [
      `M${x(15)} ${NECK_Y - 1}`,
      `Q${x(46)} ${g.sy - 10} ${x(sh)} ${g.sy + 2}`,
      `Q${x(chest + 2)} ${g.sy + 34} ${x(chest)} 128`,
      `C${x(chest - 2)} 170 ${x(waist)} 200 ${x(waist)} 240`,
      `C${x(waist)} 270 ${x(waist + 2)} 290 ${x(waist)} 300`,
      `Q${x(waist - 20)} 318 ${x(0)} 316`,
      `L${x(0)} ${NECK_Y}`,
      "Z",
    ].join(" ");
  };
  const sleeve = (d: number) => {
    const x = (v: number) => CX + d * v;
    return [
      `M${x(sh - 1)} ${g.sy + 1}`,
      `C${x(sh + 10)} ${g.sy + 6} ${x(sh + 14)} ${g.sy + 70} ${x(sh + 15)} 280`,
      `L${x(sh + 15)} 300 L${x(sh - 2)} 302 L${x(sh - 2)} 282`,
      `C${x(sh - 4)} 240 ${x(sh - 6)} 180 ${x(chest - 4)} 128`,
      `Q${x(sh - 4)} ${g.sy + 24} ${x(sh - 1)} ${g.sy + 1}`,
      "Z",
    ].join(" ");
  };
  const bodyL = half(-1);
  const bodyR = half(1);
  const collar = (d: number) => {
    const x = (v: number) => CX + d * v;
    return `M${x(16)} ${NECK_Y - 3} Q${x(20)} ${NECK_Y + 8} ${x(15)} ${NECK_Y + 22} L${x(3)} ${NECK_Y + 13} L${x(0)} ${NECK_Y + 3} Q${x(8)} ${NECK_Y - 1} ${x(16)} ${NECK_Y - 3} Z`;
  };
  const neckwear = hasNeckwear(o) && !three && !back;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={bodyL} />
          <path d={bodyR} />
        </clipPath>
      </defs>
      <path d={bodyL} fill={SHIRT} />
      <path d={bodyR} fill={SHIRT} />
      <Lit ctx={ctx} clip={clip}>
        <Crease ctx={ctx} d={`M${CX - 56} 140 Q${CX - 40} 180 ${CX - 34} 230`} opacity={0.05} width={6} />
        <Crease ctx={ctx} d={`M${CX + 56} 150 Q${CX + 42} 190 ${CX + 38} 240`} opacity={0.06} width={6} />
        {back ? (
          <g>
            <path d={`M${CX - 70} 70 Q${CX} 80 ${CX + 70} 70`} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="0.6" />
            <Crease ctx={ctx} d={`M${CX} 72 L${CX} 110`} opacity={0.12} width={3} />
          </g>
        ) : (
          <g>
            <path d={`M${CX - 6} ${NECK_Y + 8} L${CX - 6} 316 M${CX + 6} ${NECK_Y + 8} L${CX + 6} 316`} fill="none" stroke="#000" strokeOpacity="0.14" strokeWidth="0.5" />
            <Crease ctx={ctx} d={`M${CX + 7} ${NECK_Y + 10} L${CX + 7} 314`} opacity={0.1} width={2} />
          </g>
        )}
      </Lit>
      <InnerShadow ctx={ctx} d={`${bodyL} ${bodyR}`} clip={clip} width={12} opacity={0.18} />
      <path d={`${bodyL} ${bodyR}`} fill="none" stroke="rgba(60,50,40,0.28)" strokeWidth="0.45" />
      {!back
        ? [74, 112, 150, 188, 226, 264, 300].map((y) => (
            <g key={y}>
              <circle cx={CX + 0.3} cy={y + 0.6} r={2} fill="#000" opacity="0.18" />
              <circle cx={CX} cy={y} r={2} fill="#fbfaf7" stroke="rgba(0,0,0,0.25)" strokeWidth="0.35" />
            </g>
          ))
        : null}
      {[-1, 1].map((d) => {
        const p = sleeve(d);
        const sc = ctx.id(`ss${d}${back ? "b" : ""}`);
        const x = (v: number) => CX + d * v;
        return (
          <g key={d}>
            <defs>
              <clipPath id={sc}>
                <path d={p} />
              </clipPath>
            </defs>
            <CastShadow ctx={ctx} d={p} dx={-d * 2} dy={2} opacity={0.2} blur="b4" />
            <path d={p} fill={SHIRT} />
            <g clipPath={`url(#${sc})`} pointerEvents="none">
              <rect width="400" height="660" fill={`url(#${ctx.id(d === 1 ? "sleeveR" : "sleeveL")})`} opacity="0.55" />
              <Crease ctx={ctx} d={`M${x(sh + 2)} 190 Q${x(sh + 8)} 196 ${x(sh + 16)} 190`} opacity={0.14} />
              <path d={`M${x(sh - 2)} 280 L${x(sh + 15)} 280`} stroke="#000" strokeOpacity="0.22" strokeWidth="0.6" />
            </g>
            <path d={p} fill="none" stroke="rgba(60,50,40,0.28)" strokeWidth="0.45" />
            <circle cx={x(sh + 11)} cy={290} r={1.6} fill="#fbfaf7" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />
          </g>
        );
      })}
      {back ? (
        <path d={`M${CX - 17} ${NECK_Y - 4} Q${CX} ${NECK_Y - 7} ${CX + 17} ${NECK_Y - 4} L${CX + 19} ${NECK_Y + 6} Q${CX} ${NECK_Y + 3} ${CX - 19} ${NECK_Y + 6} Z`} fill="#fbfaf7" stroke="rgba(0,0,0,0.22)" strokeWidth="0.4" />
      ) : (
        <g>
          <path d={`M${CX - 16} ${NECK_Y - 3} Q${CX} ${NECK_Y - 8} ${CX + 16} ${NECK_Y - 3} L${CX} ${NECK_Y + 4} Z`} fill="#e9e6df" />
          {neckwear ? <Neckwear ctx={ctx} apex={[CX, 262]} neckY={NECK_Y - 2} maxLen={214} /> : null}
          {[-1, 1].map((d) => (
            <g key={d}>
              <CastShadow ctx={ctx} d={collar(d)} dx={d * 0.6} dy={1.2} opacity={0.25} blur="b1" />
              <path d={collar(d)} fill="#fbfaf7" stroke="rgba(0,0,0,0.22)" strokeWidth="0.4" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

/* ==================================================================== */
/* Folded trousers (page space)                                           */
/* ==================================================================== */

function FoldedTrousers({ ctx, back }: { ctx: Ctx; back: boolean }) {
  const o = ctx.o;
  const fit = o["trousers.fit"] ?? "classic";
  const legBottom = fit === "slim" ? 588 : fit === "relaxed" ? 606 : 597;
  const turnups = o["trousers.hem"] === "turnups";
  const waist = o["trousers.waist"] ?? "loops";
  const pleats = o["trousers.pleats"] ?? "none";
  const backPockets = o["trousers.backPockets"] ?? "jetted2";
  const clip = ctx.id(back ? "trb" : "trf");
  const light = luminance(ctx.tf.hex) > 0.4;
  const edge = light ? "rgba(45,35,25,0.38)" : "rgba(0,0,0,0.45)";
  const stitch = light ? "rgba(45,35,25,0.22)" : "rgba(255,255,255,0.10)";
  const belt = getOptionValue("accents.belt", o["accents.belt"] ?? "none");
  const body = `M74 498 Q210 494 344 495 L366 496 L367 640 Q330 646 290 652 L74 ${legBottom} Z`;
  const band = `M344 495 L366 496 L367 640 L346 642 Z`;
  return (
    <g transform={back ? "translate(440 0) scale(-1 1)" : undefined}>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={ctx.texT} />
      <g clipPath={`url(#${clip})`} pointerEvents="none">
        <rect width="400" height="660" y="0" fill={`url(#${ctx.id("trouserKey")})`} />
        <rect width="400" height="660" filter={`url(#${ctx.id("cloth")})`} />
        {/* fold running along the leg */}
        <Crease ctx={ctx} d={`M76 ${legBottom - 4} L292 650`} opacity={0.5} width={6} />
        <Crease ctx={ctx} d={`M78 538 Q200 532 336 520`} opacity={0.1} highlight width={5} />
        <line x1="80" y1="540" x2="330" y2="524" stroke={stitch} strokeWidth="0.6" />
        {/* waistband */}
        <path d={band} fill="#fff" opacity="0.05" />
        <CastShadow ctx={ctx} d={`M344 495 L346 495 L348 642 L346 642 Z`} dx={-1.5} dy={0} opacity={0.5} blur="b1" />
        {turnups ? (
          <g>
            <rect x="74" y="490" width="27" height="170" fill="#000" opacity="0.06" />
            <CastShadow ctx={ctx} d={`M101 494 L103 494 L103 ${legBottom + 10} L101 ${legBottom + 10} Z`} dx={1.5} dy={0} opacity={0.5} blur="b1" />
          </g>
        ) : null}
      </g>
      <InnerShadow ctx={ctx} d={body} clip={clip} width={12} opacity={0.3} />
      <path d={body} fill="none" stroke={edge} strokeWidth="0.6" />
      <line x1="345" y1="495" x2="347" y2="642" stroke={edge} strokeWidth="0.6" />
      {turnups ? <line x1="101" y1="497" x2="101" y2={legBottom + 1} stroke={edge} strokeWidth="0.7" /> : null}

      {/* Front details (top edge side) */}
      {!back ? (
        <g>
          {pleats !== "none" ? <path d="M343 500 Q300 520 262 552" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="0.8" /> : null}
          {pleats === "double" ? <path d="M343 512 Q312 528 288 548" fill="none" stroke="#000" strokeOpacity="0.32" strokeWidth="0.7" /> : null}
          {o["trousers.sidePockets"] === "seam" ? (
            <line x1="305" y1="497" x2="338" y2="497" stroke="#000" strokeOpacity="0.5" strokeWidth="0.8" />
          ) : (
            <path d="M318 497 L338 528" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="0.8" />
          )}
          {o["trousers.fastening"] === "extended" ? <path d="M352 496 L366 496 L366 488 Q359 484 352 488 Z" fill={ctx.texT} stroke={edge} strokeWidth="0.5" /> : null}
        </g>
      ) : null}

      {/* Back pocket (lower side of the fold) */}
      {backPockets !== "none" ? (
        backPockets === "flap2" ? (
          <g>
            <CastShadow ctx={ctx} d="M310 560 L324 560 L324 612 L310 612 Z" dx={-1} dy={0.5} opacity={0.4} blur="b1" />
            <path d="M310 560 L324 560 L324 612 L310 612 Z" fill={ctx.texT} stroke={edge} strokeWidth="0.5" />
            <circle cx="316" cy="586" r="2.6" fill={ctx.buttonHex} stroke="rgba(0,0,0,0.4)" strokeWidth="0.4" />
          </g>
        ) : (
          <g>
            <line x1="318" y1="562" x2="318" y2="612" stroke="#000" strokeOpacity="0.6" strokeWidth="0.9" />
            <line x1="320" y1="562" x2="320" y2="612" stroke="#fff" strokeOpacity="0.1" strokeWidth="0.6" />
            <circle cx="308" cy="587" r="2.6" fill={ctx.buttonHex} stroke="rgba(0,0,0,0.4)" strokeWidth="0.4" />
            <circle cx="308" cy="587" r="2.6" fill={`url(#${ctx.id("button")})`} />
          </g>
        )
      ) : null}

      {/* Waist details on the band */}
      {waist === "loops" && belt?.hex ? (
        <g>
          <path d="M349 495 L363 496 L364 641 L350 641 Z" fill={belt.hex} />
          <path d="M349 495 L363 496 L364 641 L350 641 Z" fill={`url(#${ctx.id("sheen")})`} opacity="0.6" />
          {!back ? <rect x="348" y="505" width="17" height="11" fill="none" stroke="#b9a468" strokeWidth="1.6" /> : null}
        </g>
      ) : null}
      {waist === "loops"
        ? [506, 568, 628].map((y) => (
            <g key={y}>
              <rect x="343" y={y + 1} width="26" height="4.5" fill="#000" opacity="0.3" filter={`url(#${ctx.id("b1")})`} />
              <rect x="343" y={y} width="26" height="4.5" fill={ctx.texT} stroke={edge} strokeWidth="0.45" />
            </g>
          ))
        : null}
      {waist === "adjusters" ? (
        <g>
          <rect x="348" y="520" width="16" height="7" fill={ctx.texT} stroke={edge} strokeWidth="0.5" />
          <rect x="352" y="517" width="8" height="13" fill="none" stroke="#b8bcc2" strokeWidth="1.5" />
        </g>
      ) : null}
      {waist === "active" ? <path d="M350 520 q2 3 0 6 q-2 3 0 6 q2 3 0 6" fill="none" stroke={edge} strokeWidth="0.6" /> : null}
      {o["trousers.braces"] === "yes" ? [512, 548].map((y) => <circle key={y} cx="355" cy={y} r="1.8" fill={ctx.buttonHex} stroke="rgba(0,0,0,0.4)" strokeWidth="0.3" />) : null}
      {!back && o["trousers.fastening"] !== "hidden" ? (
        <g>
          <circle cx="357" cy={o["trousers.fastening"] === "extended" ? 491 : 500} r="2.8" fill={ctx.buttonHex} />
          <circle cx="357" cy={o["trousers.fastening"] === "extended" ? 491 : 500} r="2.8" fill={`url(#${ctx.id("button")})`} />
        </g>
      ) : null}
    </g>
  );
}
