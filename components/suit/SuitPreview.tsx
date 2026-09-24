"use client";

import { useId } from "react";
import { BUTTON_HEX, FELT_COLOURS, LINING_COLOURS, MONOGRAM_FONTS, THREAD_COLOURS, getFabric, getOptionValue } from "@/lib/suit/catalogue";
import type { SuitConfig, SuitFabric } from "@/lib/suit/types";
import { luminance, mix, shade } from "./color";
import { FabricPattern, LiningPattern } from "./patterns";

export type PreviewView = "front" | "back" | "lining" | "waistcoat";

/**
 * Live, parametric technical drawing of the configured suit. Every option
 * that changes how the garment looks is drawn from the config — lapel cut
 * and width, closure and button layout, pockets, vents, sleeve buttons,
 * lining, contrast threads, monogram, trousers details and the waistcoat —
 * over a procedural texture of the chosen cloth. Pure function of props, so
 * the same component renders the big stage, cart thumbnails and saved
 * designs.
 */
export function SuitPreview({
  config,
  view = "front",
  className = "",
  title,
  uid,
}: {
  config: SuitConfig;
  view?: PreviewView;
  className?: string;
  title?: string;
  /** Explicit id prefix — only needed when rendering outside one React root. */
  uid?: string;
}) {
  const autoId = useId();
  const rid = (uid ?? autoId).replace(/[^a-zA-Z0-9]/g, "");
  const id = (s: string) => `${rid}-${s}`;
  const o = config.options;
  const three = o["suit.pieces"] === "three";
  const effectiveView: PreviewView = view === "waistcoat" && !three ? "front" : view;

  const jf = getFabric(config.fabric) ?? getFabric("house-navy-stretch")!;
  const tf = getFabric(config.trouserFabric ?? config.fabric) ?? jf;
  const wf = getFabric(config.waistcoatFabric ?? config.fabric) ?? jf;
  const liningColour =
    o["accents.liningColour"] === "custom" ? LINING_COLOURS.find((l) => l.id === config.lining) ?? LINING_COLOURS[0]! : houseLining(jf);
  const thread = THREAD_COLOURS.find((t) => t.id === config.thread)?.hex ?? "#8a4432";
  const holes = o["accents.buttonholes"] ?? "matched";
  const matchedThread = shade(jf.hex, luminance(jf.hex) > 0.4 ? -0.3 : 0.18);
  const lapelThread = holes === "lapel" || holes === "all" ? thread : matchedThread;
  const cuffThread = holes === "cuffs" || holes === "all" ? thread : matchedThread;
  const frontThread = holes === "all" ? thread : matchedThread;
  const buttonHex = BUTTON_HEX[o["accents.buttons"] ?? "matched"] ?? shade(jf.hex, luminance(jf.hex) > 0.35 ? -0.45 : -0.55);
  const metal = o["accents.buttons"] === "gold" || o["accents.buttons"] === "silver";
  const stroke = luminance(jf.hex) > 0.45 ? "rgba(40,30,20,0.55)" : "rgba(0,0,0,0.55)";
  const seam = luminance(jf.hex) > 0.45 ? "rgba(40,30,20,0.28)" : "rgba(255,255,255,0.14)";
  const satin = o["jacket.lapelFacing"] === "satin";
  const satinHex = luminance(jf.hex) > 0.3 ? shade(jf.hex, -0.1) : mix(jf.hex, "#000000", 0.35);
  const pick = o["accents.pickStitch"] === "yes";
  const pickThread = shade(jf.hex, luminance(jf.hex) > 0.4 ? -0.35 : 0.35);

  const ctx: Ctx = {
    id,
    o,
    jf,
    stroke,
    seam,
    buttonHex,
    metal,
    lapelThread,
    cuffThread,
    frontThread,
    satin,
    satinHex,
    pick,
    pickThread,
    liningFill: `url(#${id("lining")})`,
  };

  return (
    <svg
      viewBox="0 0 400 660"
      className={className}
      role="img"
      aria-label={title ?? "Preview of your custom suit"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <FabricPattern id={id("fj")} fabric={jf} />
        <FabricPattern id={id("ft")} fabric={tf} />
        <FabricPattern id={id("fw")} fabric={wf} />
        <LiningPattern id={id("lining")} colour={liningColour} />
        <pattern id={id("satin")} width="400" height="660" patternUnits="userSpaceOnUse">
          <rect width="400" height="660" fill={satinHex} />
        </pattern>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id("bodyShade")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.26" />
          <stop offset="0.22" stopColor="#000" stopOpacity="0.02" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.78" stopColor="#000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={id("vShade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={id("sleeveShadeR")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={id("sleeveShadeL")} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id={id("button")} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity={metal ? 0.7 : 0.35} />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
        <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id={id("shadow")} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
          <feOffset dy="4" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.22" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${id("shadow")})`}>
        {effectiveView === "waistcoat" ? (
          <Waistcoat ctx={ctx} fill={`url(#${id("fw")})`} back={false} />
        ) : effectiveView === "back" ? (
          <JacketBack ctx={ctx} />
        ) : effectiveView === "lining" ? (
          <JacketLining ctx={ctx} config={config} />
        ) : (
          <JacketFront ctx={ctx} config={config} />
        )}
        <Trousers ctx={ctx} fill={`url(#${id("ft")})`} fabric={tf} back={effectiveView === "back"} />
      </g>
    </svg>
  );
}

function houseLining(f: SuitFabric) {
  // Tone-matched house lining: a slightly lifted, desaturated version of the cloth.
  const hex = luminance(f.hex) > 0.4 ? shade(f.hex, -0.12) : shade(f.hex, 0.12);
  return { id: "house", name: "House", hex };
}

interface Ctx {
  id: (s: string) => string;
  o: Record<string, string>;
  jf: SuitFabric;
  stroke: string;
  seam: string;
  buttonHex: string;
  metal: boolean;
  lapelThread: string;
  cuffThread: string;
  frontThread: string;
  satin: boolean;
  satinHex: string;
  pick: boolean;
  pickThread: string;
  liningFill: string;
}

/* -------------------------------------------------------------------- */
/* Geometry                                                              */
/* -------------------------------------------------------------------- */

const CX = 200;
const NECK_Y = 38;
const NECK_W = 18;
const HEM_Y = 322;

function fitDims(fit: string | undefined) {
  if (fit === "slim") return { waist: 78, hem: 90, chest: 96 };
  if (fit === "relaxed") return { waist: 90, hem: 100, chest: 102 };
  return { waist: 84, hem: 95, chest: 99 };
}

function shoulderY(o: Record<string, string>) {
  return o["jacket.shoulder"] === "structured" ? 55 : o["jacket.shoulder"] === "roped" ? 55 : 60;
}

/** Half-body silhouette for side d (+1 viewer-right, −1 viewer-left), reaching the centre line. */
function halfBody(d: number, o: Record<string, string>, frontEdgeX = 0) {
  const f = fitDims(o["jacket.fit"]);
  const sy = shoulderY(o);
  const x = (v: number) => CX + d * v;
  return [
    `M${x(NECK_W)} ${NECK_Y - 2}`,
    `Q${x(55)} ${sy - 10} ${x(92)} ${sy}`,
    `Q${x(f.chest + 1)} ${sy + 30} ${x(f.chest)} 128`,
    `C${x(f.chest - 4)} 170 ${x(f.waist)} 190 ${x(f.waist)} 212`,
    `C${x(f.waist)} 250 ${x(f.hem)} 290 ${x(f.hem)} ${HEM_Y}`,
    `Q${x(50)} ${HEM_Y + 5} ${x(frontEdgeX)} ${HEM_Y + 2}`,
    `L${x(frontEdgeX)} ${NECK_Y + 4}`,
    "Z",
  ].join(" ");
}

function sleevePath(d: number, o: Record<string, string>) {
  const f = fitDims(o["jacket.fit"]);
  const sy = shoulderY(o);
  const x = (v: number) => CX + d * v;
  const w = f.chest - 99; // relaxed sleeves a touch fuller
  return [
    `M${x(92)} ${sy}`,
    `C${x(112 + w)} ${sy + 12} ${x(118 + w)} ${sy + 90} ${x(124 + w)} 300`,
    `L${x(98)} 307`,
    `C${x(96)} 250 ${x(96)} 180 ${x(f.chest - 3)} 132`,
    `Q${x(97)} ${sy + 20} ${x(92)} ${sy}`,
    "Z",
  ].join(" ");
}

type Closure = "sb1" | "sb2" | "sb3" | "db4" | "db6" | "mandarin";

function closureLayout(closure: Closure) {
  switch (closure) {
    case "sb1":
      return { apexX: CX, apexY: 206, buttons: [[CX, 206]] as [number, number][], db: false };
    case "sb3":
      return { apexX: CX, apexY: 196, buttons: [[CX + 4, 160], [CX, 200], [CX, 242]] as [number, number][], db: false };
    case "db4":
      return { apexX: 178, apexY: 186, buttons: [[CX - 22, 202], [CX + 22, 202], [CX - 22, 246], [CX + 22, 246]] as [number, number][], db: true };
    case "db6":
      return {
        apexX: 176,
        apexY: 184,
        buttons: [[CX - 30, 160], [CX + 30, 160], [CX - 22, 204], [CX + 22, 204], [CX - 22, 248], [CX + 22, 248]] as [number, number][],
        db: true,
      };
    case "mandarin":
      return { apexX: CX, apexY: 44, buttons: [66, 106, 146, 186, 226].map((y) => [CX, y]) as [number, number][], db: false };
    case "sb2":
    default:
      return { apexX: CX, apexY: 186, buttons: [[CX, 186], [CX, 232]] as [number, number][], db: false };
  }
}

const LAPEL_W: Record<string, number> = { slim: 19, standard: 26, wide: 34 };

/** Lapel (and collar) outlines for side d, rolling from apex A up to the neck. */
function lapelShapes(d: number, A: [number, number], style: string, widthKey: string, db: boolean) {
  const N: [number, number] = [CX + d * (NECK_W - 1), NECK_Y + 1];
  const lw = LAPEL_W[widthKey] ?? 26;
  const rollX = (y: number) => A[0] + ((N[0] - A[0]) * (A[1] - y)) / (A[1] - N[1]);
  const gy = db ? 98 : 96;
  const G: [number, number] = [rollX(gy + 4), gy + 4];

  if (style === "shawl") {
    const tipX = rollX(120) + d * (lw + 4);
    const lapel = `M${A[0]} ${A[1]} C${A[0] + d * lw * 0.9} ${A[1] - 30} ${tipX} 150 ${tipX} 118 C${tipX} 80 ${N[0] + d * 22} 52 ${N[0] + d * 10} 32 L${N[0]} ${N[1]} Z`;
    return { lapel, collar: null as string | null, edge: `M${A[0]} ${A[1]} C${A[0] + d * lw * 0.9} ${A[1] - 30} ${tipX} 150 ${tipX} 118 C${tipX} 80 ${N[0] + d * 22} 52 ${N[0] + d * 10} 32`, buttonhole: [rollX(118) + d * (lw * 0.55), 122] as [number, number] };
  }

  let T: [number, number];
  let Q: [number, number];
  let C: [number, number];
  if (style === "peak") {
    T = [rollX(gy) + d * (lw + 14), gy - 12];
    Q = [T[0] - d * (lw * 0.62), gy + 6];
    C = [Q[0] - d * 2, gy - 7];
  } else {
    T = [rollX(gy + 12) + d * lw, gy + 12];
    Q = [T[0] - d * (lw * 0.42), gy + 2];
    C = [T[0] - d * 1, gy - 9];
  }
  const belly: [number, number] = [A[0] + d * (lw * (db ? 1.05 : 0.8)), (A[1] + T[1]) / 2 + 6];
  const lapel = `M${A[0]} ${A[1]} Q${belly[0]} ${belly[1]} ${T[0]} ${T[1]} L${Q[0]} ${Q[1]} L${G[0]} ${G[1]} Z`;
  const collar = `M${Q[0]} ${Q[1]} L${C[0]} ${C[1]} Q${N[0] + d * 20} ${NECK_Y + 4} ${N[0] + d * 6} ${NECK_Y - 8} L${N[0] - d * 2} ${NECK_Y - 6} L${G[0]} ${G[1]} Z`;
  const edge = `M${A[0]} ${A[1]} Q${belly[0]} ${belly[1]} ${T[0]} ${T[1]} L${Q[0]} ${Q[1]}`;
  const bhY = gy + 26;
  return { lapel, collar, edge, buttonhole: [rollX(bhY) + d * (lw * 0.62), bhY] as [number, number] };
}

/* -------------------------------------------------------------------- */
/* Small parts                                                           */
/* -------------------------------------------------------------------- */

function Button({ ctx, x, y, r = 5 }: { ctx: Ctx; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={ctx.buttonHex} stroke="rgba(0,0,0,0.45)" strokeWidth="0.6" />
      <circle cx={x} cy={y} r={r} fill={`url(#${ctx.id("button")})`} />
      {!ctx.metal && r > 3 ? (
        <g fill="rgba(0,0,0,0.45)">
          <circle cx={x - 1.3} cy={y - 1.3} r="0.6" />
          <circle cx={x + 1.3} cy={y - 1.3} r="0.6" />
          <circle cx={x - 1.3} cy={y + 1.3} r="0.6" />
          <circle cx={x + 1.3} cy={y + 1.3} r="0.6" />
        </g>
      ) : null}
    </g>
  );
}

function Overlay({ ctx, clip, shadeId }: { ctx: Ctx; clip: string; shadeId: string }) {
  return (
    <g clipPath={`url(#${clip})`} pointerEvents="none">
      <rect x="0" y="0" width="400" height="660" fill={`url(#${ctx.id(shadeId)})`} />
      <rect x="0" y="0" width="400" height="660" filter={`url(#${ctx.id("grain")})`} opacity="0.5" />
    </g>
  );
}

function PickStitch({ ctx, d }: { ctx: Ctx; d: string }) {
  if (!ctx.pick) return null;
  return <path d={d} fill="none" stroke={ctx.pickThread} strokeWidth="0.9" strokeDasharray="0.6 2.4" transform="translate(0 0)" opacity="0.95" />;
}

function Pockets({ ctx, lining = false }: { ctx: Ctx; lining?: boolean }) {
  const o = ctx.o;
  const style = o["jacket.pockets"];
  if (style === "none" || lining) return null;
  const slant = style !== "patch" && o["jacket.pocketSlant"] === "slanted";
  const fill = `url(#${ctx.id("fj")})`;
  const y = 252;
  const draw = (d: number, width: number, cy: number, small = false) => {
    const cx = CX + d * 62 + (small ? -d * 4 : 0);
    const rot = slant ? d * 7 : 0;
    const w = width;
    if (style === "patch") {
      const h = small ? 20 : 46;
      const top = cy - (small ? 6 : 14);
      return (
        <g key={`${d}-${cy}`}>
          <path
            d={`M${cx - w / 2} ${top} L${cx + w / 2} ${top} L${cx + w / 2} ${top + h - 6} Q${cx + w / 2} ${top + h} ${cx + w / 2 - 6} ${top + h} L${cx - w / 2 + 6} ${top + h} Q${cx - w / 2} ${top + h} ${cx - w / 2} ${top + h - 6} Z`}
            fill={fill}
            stroke={ctx.stroke}
            strokeWidth="0.8"
          />
          <path d={`M${cx - w / 2 + 2.5} ${top + 3} L${cx + w / 2 - 2.5} ${top + 3}`} stroke={ctx.seam} strokeWidth="0.7" strokeDasharray="1.5 1.5" />
          {ctx.pick ? <path d={`M${cx - w / 2 + 3} ${top + 3} L${cx - w / 2 + 3} ${top + h - 5}`} stroke={ctx.pickThread} strokeWidth="0.9" strokeDasharray="0.6 2.4" /> : null}
        </g>
      );
    }
    if (style === "jetted") {
      return (
        <g key={`${d}-${cy}`} transform={`rotate(${rot} ${cx} ${cy})`}>
          <rect x={cx - w / 2} y={cy - 2.5} width={w} height={5} fill={fill} stroke={ctx.stroke} strokeWidth="0.7" />
          <line x1={cx - w / 2} y1={cy} x2={cx + w / 2} y2={cy} stroke={ctx.stroke} strokeWidth="0.6" />
        </g>
      );
    }
    const h = small ? 11 : 16;
    return (
      <g key={`${d}-${cy}`} transform={`rotate(${rot} ${cx} ${cy})`}>
        <line x1={cx - w / 2} y1={cy - 1.5} x2={cx + w / 2} y2={cy - 1.5} stroke={ctx.stroke} strokeWidth="0.7" />
        <path
          d={`M${cx - w / 2} ${cy} L${cx + w / 2} ${cy} L${cx + w / 2} ${cy + h - 3} Q${cx + w / 2} ${cy + h} ${cx + w / 2 - 3} ${cy + h} L${cx - w / 2 + 3} ${cy + h} Q${cx - w / 2} ${cy + h} ${cx - w / 2} ${cy + h - 3} Z`}
          fill={fill}
          stroke={ctx.stroke}
          strokeWidth="0.8"
        />
        <rect x={cx - w / 2} y={cy} width={w} height={h} fill="#000" opacity="0.06" />
        {ctx.pick ? (
          <path d={`M${cx - w / 2 + 2.5} ${cy + 2} L${cx - w / 2 + 2.5} ${cy + h - 2.5} L${cx + w / 2 - 2.5} ${cy + h - 2.5} L${cx + w / 2 - 2.5} ${cy + 2}`} fill="none" stroke={ctx.pickThread} strokeWidth="0.8" strokeDasharray="0.6 2.2" />
        ) : null}
      </g>
    );
  };
  const ticket = o["jacket.ticketPocket"] === "ticket";
  return (
    <g>
      {draw(-1, style === "patch" ? 56 : 52, y)}
      {draw(1, style === "patch" ? 56 : 52, y)}
      {ticket ? draw(-1, style === "patch" ? 40 : 36, y - 26, true) : null}
    </g>
  );
}

function BreastPocket({ ctx }: { ctx: Ctx }) {
  const o = ctx.o;
  const style = o["jacket.breastPocket"];
  const square = o["accents.pocketSquare"];
  const sq = getOptionValue("accents.pocketSquare", square ?? "none");
  const cx = CX + 58;
  const cy = 138;
  const fill = `url(#${ctx.id("fj")})`;
  return (
    <g>
      {style !== "none" && sq?.hex ? (
        <path
          d={`M${cx - 12} ${cy + 1} L${cx - 9} ${cy - 9} L${cx - 3} ${cy - 4} L${cx + 2} ${cy - 11} L${cx + 7} ${cy - 5} L${cx + 12} ${cy - 8} L${cx + 13} ${cy + 1} Z`}
          fill={sq.hex}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.6"
          transform={style === "welt" ? `rotate(-5 ${cx} ${cy})` : undefined}
        />
      ) : null}
      {style === "welt" ? (
        <g transform={`rotate(-5 ${cx} ${cy})`}>
          <rect x={cx - 16} y={cy} width={32} height={7} fill={fill} stroke={ctx.stroke} strokeWidth="0.8" />
          <rect x={cx - 16} y={cy} width={32} height={7} fill="#fff" opacity="0.05" />
        </g>
      ) : null}
      {style === "patch" ? (
        <g>
          <path
            d={`M${cx - 16} ${cy - 2} L${cx + 16} ${cy - 2} L${cx + 16} ${cy + 24} Q${cx + 16} ${cy + 28} ${cx + 12} ${cy + 28} L${cx - 12} ${cy + 28} Q${cx - 16} ${cy + 28} ${cx - 16} ${cy + 24} Z`}
            fill={fill}
            stroke={ctx.stroke}
            strokeWidth="0.8"
          />
          <line x1={cx - 13} y1={cy + 1} x2={cx + 13} y2={cy + 1} stroke={ctx.seam} strokeWidth="0.7" strokeDasharray="1.5 1.5" />
        </g>
      ) : null}
    </g>
  );
}

function SleeveButtons({ ctx, d }: { ctx: Ctx; d: number }) {
  const n = Number(ctx.o["jacket.sleeveButtons"] ?? 4);
  const f = fitDims(ctx.o["jacket.fit"]);
  const w = f.chest - 99;
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = CX + d * (116 + w - i * 1.1);
    const y = 294 - i * 6.2;
    items.push(
      <g key={i}>
        <line x1={x - d * 1} y1={y} x2={x - d * 7} y2={y - 0.5} stroke={ctx.cuffThread} strokeWidth="1" strokeLinecap="round" />
        <Button ctx={ctx} x={x} y={y} r={2.5} />
      </g>,
    );
  }
  return <g>{items}</g>;
}

function Shirt({ apex }: { apex: [number, number] }) {
  const [ax, ay] = apex;
  return (
    <g>
      <path d={`M${CX - NECK_W - 1} ${NECK_Y - 1} Q${CX} ${NECK_Y + 6} ${CX + NECK_W + 1} ${NECK_Y - 1} L${ax} ${ay} Z`} fill="#f6f4ee" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
      <path d={`M${CX - NECK_W + 2} ${NECK_Y - 3} L${CX - 2} ${NECK_Y + 14} L${CX - 11} ${NECK_Y + 20} Z M${CX + NECK_W - 2} ${NECK_Y - 3} L${CX + 2} ${NECK_Y + 14} L${CX + 11} ${NECK_Y + 20} Z`} fill="#fbfaf7" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      <line x1={CX} y1={NECK_Y + 14} x2={ax} y2={ay} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
      {[NECK_Y + 30, NECK_Y + 58, NECK_Y + 86, NECK_Y + 114].filter((y) => y < ay - 6).map((y) => (
        <circle key={y} cx={CX + ((ax - CX) * (y - NECK_Y)) / (ay - NECK_Y) * 0.0} cy={y} r="1.1" fill="#e6e1d6" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />
      ))}
    </g>
  );
}

/** Necktie or bow tie at the collar, when chosen. */
function Neckwear({ ctx, apex, neckY }: { ctx: Ctx; apex: [number, number]; neckY: number }) {
  const tie = getOptionValue("accents.necktie", ctx.o["accents.necktie"] ?? "none");
  const bow = getOptionValue("accents.bowtie", ctx.o["accents.bowtie"] ?? "none");
  const [ax, ay] = apex;
  if (tie?.hex) {
    const kY = neckY + 11;
    const end = Math.min(ay + 6, neckY + 170);
    const endX = CX + ((ax - CX) * (end - neckY)) / Math.max(1, ay - neckY);
    return (
      <g>
        <path d={`M${CX - 4.5} ${kY + 7} L${CX + 4.5} ${kY + 7} L${endX + 7} ${end - 9} L${endX} ${end} L${endX - 7} ${end - 9} Z`} fill={tie.hex} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
        <path d={`M${CX - 5} ${kY} L${CX + 5} ${kY} L${CX + 4} ${kY + 8} L${CX - 4} ${kY + 8} Z`} fill={shade(tie.hex, -0.12)} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
        <path d={`M${CX - 4.5} ${kY + 7} L${CX + 4.5} ${kY + 7} L${endX + 7} ${end - 9} L${endX} ${end} L${endX - 7} ${end - 9} Z`} fill={`url(#${ctx.id("sheen")})`} opacity="0.6" />
      </g>
    );
  }
  if (bow?.hex) {
    const y = neckY + 12;
    return (
      <g stroke="rgba(0,0,0,0.45)" strokeWidth="0.5">
        <path d={`M${CX} ${y} L${CX - 13} ${y - 6} Q${CX - 15} ${y} ${CX - 13} ${y + 6} Z M${CX} ${y} L${CX + 13} ${y - 6} Q${CX + 15} ${y} ${CX + 13} ${y + 6} Z`} fill={bow.hex} />
        <rect x={CX - 2.5} y={y - 3.5} width="5" height="7" fill={shade(bow.hex, -0.15)} />
      </g>
    );
  }
  return null;
}

/* -------------------------------------------------------------------- */
/* Jacket — front                                                        */
/* -------------------------------------------------------------------- */

function JacketFront({ ctx, config }: { ctx: Ctx; config: SuitConfig }) {
  const o = ctx.o;
  const closure = (o["jacket.closure"] ?? "sb2") as Closure;
  const layout = closureLayout(closure);
  const mandarin = closure === "mandarin";
  const fill = `url(#${ctx.id("fj")})`;
  const clipBody = ctx.id("clipBody");
  const clipSleeveR = ctx.id("clipSleeveR");
  const clipSleeveL = ctx.id("clipSleeveL");
  const A: [number, number] = [layout.apexX, layout.apexY];
  const lapelStyle = o["jacket.lapel"] ?? "notch";
  const lapelW = o["jacket.lapelWidth"] ?? "standard";
  const L = mandarin ? null : lapelShapes(-1, A, lapelStyle, lapelW, layout.db);
  const R = mandarin ? null : lapelShapes(1, A, lapelStyle, lapelW, layout.db);
  const lowestButtonY = Math.max(...layout.buttons.map((b) => b[1]));
  const lapelFill = ctx.satin ? `url(#${ctx.id("satin")})` : fill;
  const monogram = config.monogram && config.monogram.placement === "cuff" ? config.monogram : null;
  const elbow = getOptionValue("accents.elbowPatches", o["accents.elbowPatches"] ?? "none");

  return (
    <g>
      <defs>
        <clipPath id={clipBody}>
          <path d={halfBody(-1, o)} />
          <path d={halfBody(1, o)} />
        </clipPath>
        <clipPath id={clipSleeveR}>
          <path d={sleevePath(1, o)} />
        </clipPath>
        <clipPath id={clipSleeveL}>
          <path d={sleevePath(-1, o)} />
        </clipPath>
      </defs>

      {/* Sleeves (behind the body) */}
      {[-1, 1].map((d) => (
        <g key={d}>
          <path d={sleevePath(d, o)} fill={fill} stroke={ctx.stroke} strokeWidth="0.9" />
          <Overlay ctx={ctx} clip={d === 1 ? clipSleeveR : clipSleeveL} shadeId={d === 1 ? "sleeveShadeR" : "sleeveShadeL"} />
          {elbow?.hex ? (
            <ellipse cx={CX + d * 114} cy={196} rx={5} ry={17} fill={elbow.hex} opacity="0.9" stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" />
          ) : null}
          <SleeveButtons ctx={ctx} d={d} />
          {o["jacket.shoulder"] === "roped" ? (
            <path d={`M${CX + d * 88} ${shoulderY(o) - 1} Q${CX + d * 96} ${shoulderY(o) - 5} ${CX + d * 103} ${shoulderY(o) + 4}`} fill="none" stroke={ctx.stroke} strokeWidth="1" />
          ) : null}
        </g>
      ))}

      {/* Body */}
      <path d={halfBody(-1, o)} fill={fill} />
      <path d={halfBody(1, o)} fill={fill} />
      <Overlay ctx={ctx} clip={clipBody} shadeId="bodyShade" />
      <path d={halfBody(-1, o)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      <path d={halfBody(1, o)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      {/* Body seams (front darts) */}
      {[-1, 1].map((d) => (
        <path key={d} d={`M${CX + d * 58} 160 Q${CX + d * 56} 205 ${CX + d * 58} 244`} fill="none" stroke={ctx.seam} strokeWidth="0.7" />
      ))}

      {/* Opening: V (lining shows), front edge, cutaway */}
      {mandarin ? (
        <g>
          <line x1={CX} y1={NECK_Y + 2} x2={CX} y2={HEM_Y + 2} stroke={ctx.stroke} strokeWidth="0.9" />
          <path
            d={`M${CX - NECK_W - 4} ${NECK_Y - 1} Q${CX} ${NECK_Y + 7} ${CX + NECK_W + 4} ${NECK_Y - 1} L${CX + NECK_W + 2} ${NECK_Y - 13} Q${CX} ${NECK_Y - 7} ${CX - NECK_W - 2} ${NECK_Y - 13} Z`}
            fill={ctx.satin ? `url(#${ctx.id("satin")})` : fill}
            stroke={ctx.stroke}
            strokeWidth="0.9"
          />
          <path d={`M${CX - NECK_W - 2} ${NECK_Y - 13} Q${CX} ${NECK_Y - 22} ${CX + NECK_W + 2} ${NECK_Y - 13} Q${CX} ${NECK_Y - 7} ${CX - NECK_W - 2} ${NECK_Y - 13} Z`} fill={ctx.liningFill} stroke={ctx.stroke} strokeWidth="0.6" />
          <line x1={CX} y1={NECK_Y - 9} x2={CX} y2={NECK_Y + 3} stroke={ctx.stroke} strokeWidth="0.8" />
        </g>
      ) : (
        <g>
          <Shirt apex={A} />
          <Neckwear ctx={ctx} apex={A} neckY={NECK_Y} />
          {layout.db ? (
            <line x1={A[0]} y1={A[1]} x2={A[0]} y2={HEM_Y + 2} stroke={ctx.stroke} strokeWidth="0.9" />
          ) : (
            <g>
              <path
                d={`M${CX} ${lowestButtonY + 8} Q${CX + 2} ${HEM_Y - 24} ${CX + 30} ${HEM_Y + 3} L${CX - 30} ${HEM_Y + 3} Q${CX - 2} ${HEM_Y - 24} ${CX} ${lowestButtonY + 8} Z`}
                fill={ctx.liningFill}
                stroke={ctx.stroke}
                strokeWidth="0.9"
              />
              <line x1={CX} y1={A[1]} x2={CX} y2={lowestButtonY + 8} stroke={ctx.stroke} strokeWidth="0.9" />
            </g>
          )}
        </g>
      )}

      <Pockets ctx={ctx} />
      <BreastPocket ctx={ctx} />

      {/* Lapels and collar */}
      {L && R ? (
        <g>
          {[L, R].map((s, i) => (
            <g key={i}>
              {s.collar ? <path d={s.collar} fill={fill} stroke={ctx.stroke} strokeWidth="0.9" /> : null}
              <path d={s.lapel} fill={lapelFill} stroke={ctx.stroke} strokeWidth="0.9" />
              <path d={s.lapel} fill={`url(#${ctx.id("sheen")})`} opacity={ctx.satin ? 0.9 : 0.55} />
              <PickStitch ctx={ctx} d={s.edge} />
            </g>
          ))}
          {/* Lapel buttonhole on the wearer's left lapel (viewer right) */}
          <line
            x1={R.buttonhole[0] - 5}
            y1={R.buttonhole[1] - 1.5}
            x2={R.buttonhole[0] + 5}
            y2={R.buttonhole[1] + 1.5}
            stroke={ctx.lapelThread}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {/* Front buttons + buttonholes */}
      {layout.buttons.map(([x, y], i) => (
        <g key={i}>
          {!layout.db ? (
            <line x1={x + 2} y1={y} x2={x + 13} y2={y} stroke={ctx.frontThread} strokeWidth="1.4" strokeLinecap="round" />
          ) : null}
          <Button ctx={ctx} x={x} y={y} r={closure === "mandarin" ? 4.4 : 5.2} />
        </g>
      ))}

      {monogram ? (
        <text
          x={CX - 116}
          y={276}
          fontSize="8"
          fill={THREAD_COLOURS.find((t) => t.id === monogram.thread)?.hex}
          fontFamily={MONOGRAM_FONTS.find((f) => f.id === monogram.font)?.css}
          textAnchor="middle"
          transform={`rotate(-80 ${CX - 116} 276)`}
        >
          {monogram.text}
        </text>
      ) : null}
    </g>
  );
}

/* -------------------------------------------------------------------- */
/* Jacket — back                                                         */
/* -------------------------------------------------------------------- */

function JacketBack({ ctx }: { ctx: Ctx }) {
  const o = ctx.o;
  const fill = `url(#${ctx.id("fj")})`;
  const f = fitDims(o["jacket.fit"]);
  const clipBody = ctx.id("clipBackBody");
  const vents = o["jacket.vents"];
  const elbow = getOptionValue("accents.elbowPatches", o["accents.elbowPatches"] ?? "none");
  const felt = FELT_COLOURS.find((c) => c.id === o["accents.underCollar"]);
  return (
    <g>
      <defs>
        <clipPath id={clipBody}>
          <path d={halfBody(-1, o)} />
          <path d={halfBody(1, o)} />
        </clipPath>
      </defs>
      {[-1, 1].map((d) => (
        <g key={d}>
          <path d={sleevePath(d, o)} fill={fill} stroke={ctx.stroke} strokeWidth="0.9" />
          <path d={sleevePath(d, o)} fill={`url(#${ctx.id(d === 1 ? "sleeveShadeR" : "sleeveShadeL")})`} />
          {elbow?.hex ? (
            <ellipse cx={CX + d * 108} cy={196} rx={9} ry={19} fill={elbow.hex} stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
          ) : null}
          <SleeveButtons ctx={ctx} d={d} />
        </g>
      ))}
      <path d={halfBody(-1, o)} fill={fill} />
      <path d={halfBody(1, o)} fill={fill} />
      <Overlay ctx={ctx} clip={clipBody} shadeId="bodyShade" />
      <path d={halfBody(-1, o)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      <path d={halfBody(1, o)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      {/* Collar */}
      <path
        d={`M${CX - 20} ${NECK_Y - 4} Q${CX} ${NECK_Y - 9} ${CX + 20} ${NECK_Y - 4} L${CX + 26} ${NECK_Y + 10} Q${CX} ${NECK_Y + 5} ${CX - 26} ${NECK_Y + 10} Z`}
        fill={fill}
        stroke={ctx.stroke}
        strokeWidth="0.9"
      />
      {felt ? (
        <path d={`M${CX - 25} ${NECK_Y + 7} Q${CX} ${NECK_Y + 2} ${CX + 25} ${NECK_Y + 7} L${CX + 26} ${NECK_Y + 10} Q${CX} ${NECK_Y + 5} ${CX - 26} ${NECK_Y + 10} Z`} fill={felt.hex} />
      ) : null}
      {/* Centre back seam and side-body seams */}
      <line x1={CX} y1={NECK_Y + 8} x2={CX} y2={vents === "centre" ? 250 : HEM_Y + 2} stroke={ctx.seam} strokeWidth="0.9" />
      {[-1, 1].map((d) => (
        <path key={d} d={`M${CX + d * (f.chest - 12)} 132 C${CX + d * (f.waist - 14)} 190 ${CX + d * (f.waist - 12)} 240 ${CX + d * (f.hem - 12)} ${HEM_Y + 1}`} fill="none" stroke={ctx.seam} strokeWidth="0.8" />
      ))}
      {vents === "centre" ? (
        <g>
          <line x1={CX} y1={250} x2={CX} y2={HEM_Y + 2} stroke={ctx.stroke} strokeWidth="0.9" />
          <line x1={CX + 4} y1={250} x2={CX + 4} y2={HEM_Y + 2} stroke={ctx.seam} strokeWidth="0.8" />
          <line x1={CX} y1={250} x2={CX + 4} y2={246} stroke={ctx.stroke} strokeWidth="0.8" />
        </g>
      ) : null}
      {vents === "side"
        ? [-1, 1].map((d) => (
            <g key={d}>
              <line x1={CX + d * (f.hem - 12)} y1={252} x2={CX + d * (f.hem - 12)} y2={HEM_Y + 1} stroke={ctx.stroke} strokeWidth="0.9" />
              <line x1={CX + d * (f.hem - 16)} y1={252} x2={CX + d * (f.hem - 12)} y2={248} stroke={ctx.stroke} strokeWidth="0.8" />
            </g>
          ))
        : null}
    </g>
  );
}

/* -------------------------------------------------------------------- */
/* Jacket — interior (lining)                                           */
/* -------------------------------------------------------------------- */

function JacketLining({ ctx, config }: { ctx: Ctx; config: SuitConfig }) {
  const o = ctx.o;
  const fill = `url(#${ctx.id("fj")})`;
  const clipBody = ctx.id("clipLiningBody");
  const style = o["accents.liningStyle"] ?? "full";
  const felt = FELT_COLOURS.find((c) => c.id === o["accents.underCollar"]);
  const mono = config.monogram;
  const monoFont = MONOGRAM_FONTS.find((f) => f.id === mono?.font)?.css;
  const monoHex = THREAD_COLOURS.find((t) => t.id === mono?.thread)?.hex ?? "#efe6d2";
  const f = fitDims(o["jacket.fit"]);
  return (
    <g>
      <defs>
        <clipPath id={clipBody}>
          <path d={halfBody(-1, o)} />
          <path d={halfBody(1, o)} />
        </clipPath>
      </defs>
      {[-1, 1].map((d) => (
        <g key={d}>
          <path d={sleevePath(d, o)} fill={fill} stroke={ctx.stroke} strokeWidth="0.9" />
          <path d={sleevePath(d, o)} fill={`url(#${ctx.id(d === 1 ? "sleeveShadeR" : "sleeveShadeL")})`} />
        </g>
      ))}
      {/* Inside: fabric base (visible where unlined/half-lined) */}
      <path d={halfBody(-1, o)} fill={fill} />
      <path d={halfBody(1, o)} fill={fill} />
      <g clipPath={`url(#${clipBody})`}>
        <rect width="400" height="660" fill="#000" opacity="0.12" />
        {style === "full" ? <rect x="0" y="0" width="400" height="660" fill={ctx.liningFill} /> : null}
        {style === "half" ? (
          <g>
            <rect x="0" y="0" width="400" height="660" fill={ctx.liningFill} />
            <path d={`M${CX - 70} 150 Q${CX} 190 ${CX + 70} 150 L${CX + 70} 330 L${CX - 70} 330 Z`} fill={fill} />
            <path d={`M${CX - 70} 150 Q${CX} 190 ${CX + 70} 150`} fill="none" stroke={ctx.stroke} strokeWidth="0.8" />
          </g>
        ) : null}
        {style === "unlined" ? (
          <g>
            <path d={`M${CX - 96} 50 Q${CX} 90 ${CX + 96} 50 L${CX + 96} 20 L${CX - 96} 20 Z`} fill={ctx.liningFill} />
            {[-1, 1].map((d) => (
              <path key={d} d={`M${CX + d * (f.chest - 12)} 132 C${CX + d * (f.waist - 14)} 190 ${CX + d * (f.waist - 12)} 240 ${CX + d * (f.hem - 12)} ${HEM_Y + 1}`} fill="none" stroke={ctx.liningFill} strokeWidth="3" />
            ))}
            <line x1={CX} y1={70} x2={CX} y2={HEM_Y} stroke={ctx.liningFill} strokeWidth="3" />
          </g>
        ) : null}
        {/* Front facings in suit fabric */}
        {[-1, 1].map((d) => (
          <path
            key={d}
            d={`M${CX + d * NECK_W} ${NECK_Y - 2} L${CX + d * 54} ${NECK_Y + 30} Q${CX + d * 60} 150 ${CX + d * 44} ${HEM_Y} L${CX} ${HEM_Y + 4} L${CX} ${NECK_Y} Z`}
            fill={fill}
            stroke={ctx.stroke}
            strokeWidth="0.8"
          />
        ))}
        <rect width="400" height="660" filter={`url(#${ctx.id("grain")})`} opacity="0.4" />
      </g>
      <path d={halfBody(-1, o)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      <path d={halfBody(1, o)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      {/* Opening gap down the centre */}
      <line x1={CX} y1={NECK_Y} x2={CX} y2={HEM_Y + 3} stroke="rgba(0,0,0,0.45)" strokeWidth="1.2" />
      {/* Back neck: under-collar felt + house label */}
      <path d={`M${CX - NECK_W - 2} ${NECK_Y} Q${CX} ${NECK_Y + 12} ${CX + NECK_W + 2} ${NECK_Y} L${CX + NECK_W} ${NECK_Y - 8} Q${CX} ${NECK_Y + 2} ${CX - NECK_W} ${NECK_Y - 8} Z`} fill={felt?.hex ?? shade(ctx.jf.hex, -0.1)} stroke={ctx.stroke} strokeWidth="0.7" />
      <rect x={CX - 20} y={NECK_Y + 14} width="40" height="12" fill="#efe9dc" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      <text x={CX} y={NECK_Y + 22} fontSize="5.2" textAnchor="middle" fill="#14120f" fontFamily="var(--font-display), Georgia, serif" letterSpacing="0.6">
        ASHOK SUNNY
      </text>
      {/* Inside breast pockets */}
      {[-1, 1].map((d) => (
        <g key={d}>
          <rect x={CX + d * 52 - (d === 1 ? 0 : 30)} y={150} width={30} height={5} fill={fill} stroke={ctx.stroke} strokeWidth="0.7" />
          <rect x={CX + d * 52 - (d === 1 ? 0 : 22)} y={236} width={22} height={4} fill={fill} stroke={ctx.stroke} strokeWidth="0.6" />
        </g>
      ))}
      {mono && mono.placement === "lining" ? (
        <text x={CX - 67} y={176} fontSize={mono.font === "script" ? 15 : 12} textAnchor="middle" fill={monoHex} fontFamily={monoFont} letterSpacing="1">
          {mono.text}
        </text>
      ) : null}
      {mono && mono.placement === "collar" ? (
        <text x={CX} y={NECK_Y + 5} fontSize="6" textAnchor="middle" fill={monoHex} fontFamily={monoFont}>
          {mono.text}
        </text>
      ) : null}
    </g>
  );
}

/* -------------------------------------------------------------------- */
/* Waistcoat                                                            */
/* -------------------------------------------------------------------- */

function Waistcoat({ ctx, fill }: { ctx: Ctx; fill: string; back: boolean }) {
  const o = ctx.o;
  const style = o["waistcoat.style"] ?? "sb5";
  const edge = o["waistcoat.edge"] ?? "pointed";
  const lapel = o["waistcoat.lapel"] ?? "none";
  const pockets = o["waistcoat.pockets"] ?? "welt";
  const db = style === "db6";
  const clip = ctx.id("clipVest");
  const apexY = style === "sb6" ? 132 : db ? 150 : 146;
  const apexX = db ? CX - 16 : CX;
  const bottom = edge === "pointed" ? 312 : 300;

  const half = (d: number) => {
    const x = (v: number) => CX + d * v;
    const hem =
      edge === "pointed"
        ? `L${x(84)} 282 L${x(14)} 316 L${x(0)} 306`
        : `L${x(84)} 298 L${x(10)} 300 L${x(0)} 304`;
    return `M${x(30)} 58 L${x(58)} 62 Q${x(64)} 118 ${x(88)} 142 L${x(84)} 250 ${hem} L${x(0)} 60 Z`;
  };

  const buttons: [number, number][] = db
    ? [[CX - 18, 168], [CX + 18, 168], [CX - 18, 212], [CX + 18, 212], [CX - 18, 256], [CX + 18, 256]]
    : (style === "sb6" ? [132, 162, 192, 222, 252, 282] : [146, 180, 214, 248, 282]).map((y) => [CX, y]);

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={half(-1)} />
          <path d={half(1)} />
        </clipPath>
      </defs>
      {/* Shirt collar peeking above the V */}
      <path d={`M${CX - 16} 44 L${CX} 62 L${CX + 16} 44 L${CX + 8} 38 L${CX - 8} 38 Z`} fill="#fbfaf6" stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" />
      {o["waistcoat.back"] === "fabric" ? null : (
        <path d={`M${CX - 90} 146 L${CX - 84} 250 L${CX - 70} 250 L${CX - 76} 146 Z M${CX + 90} 146 L${CX + 84} 250 L${CX + 70} 250 L${CX + 76} 146 Z`} fill={ctx.liningFill} opacity="0.9" />
      )}
      <path d={half(-1)} fill={fill} />
      <path d={half(1)} fill={fill} />
      <Overlay ctx={ctx} clip={clip} shadeId="bodyShade" />
      <path d={half(-1)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      <path d={half(1)} fill="none" stroke={ctx.stroke} strokeWidth="0.9" />
      {/* V opening shows shirt */}
      <path d={`M${CX - 30} 58 L${CX + 30} 58 L${apexX} ${apexY} Z`} fill="#f4f2ec" stroke={ctx.stroke} strokeWidth="0.8" />
      <line x1={CX} y1={62} x2={CX} y2={apexY} stroke="rgba(0,0,0,0.2)" strokeWidth="0.6" />
      <Neckwear ctx={ctx} apex={[apexX, apexY]} neckY={46} />
      {db ? <line x1={apexX} y1={apexY} x2={apexX} y2={bottom} stroke={ctx.stroke} strokeWidth="0.9" /> : <line x1={CX} y1={apexY} x2={CX} y2={edge === "pointed" ? 306 : 304} stroke={ctx.stroke} strokeWidth="0.9" />}
      {lapel !== "none"
        ? [-1, 1].map((d) => {
            const N: [number, number] = [CX + d * 30, 58];
            const rollX = (y: number) => apexX + ((N[0] - apexX) * (apexY - y)) / (apexY - 58);
            const w = 13;
            const path =
              lapel === "shawl"
                ? `M${apexX} ${apexY} Q${rollX(110) + d * (w + 4)} 110 ${N[0] + d * 8} 56 L${N[0]} ${N[1]} Z`
                : lapel === "peak"
                  ? `M${apexX} ${apexY} Q${rollX(100) + d * w} 104 ${rollX(84) + d * (w + 8)} 80 L${rollX(88) + d * 5} 90 L${rollX(88)} 88 Z`
                  : `M${apexX} ${apexY} Q${rollX(100) + d * w} 104 ${rollX(90) + d * w} 90 L${rollX(88) + d * 6} 86 L${rollX(88)} 88 Z`;
            return <path key={d} d={path} fill={fill} stroke={ctx.stroke} strokeWidth="0.8" />;
          })
        : null}
      {pockets !== "none"
        ? [
            [-1, 138, 24],
            [1, 138, 24],
            [-1, 236, 30],
            [1, 236, 30],
          ].map(([d, y, w], i) => (
            <g key={i} transform={`rotate(${(d as number) * -4} ${CX + (d as number) * 50} ${y})`}>
              <rect x={CX + (d as number) * 50 - (w as number) / 2} y={y as number} width={w as number} height={pockets === "jetted" ? 5 : 6} fill={fill} stroke={ctx.stroke} strokeWidth="0.7" />
              {pockets === "jetted" ? <line x1={CX + (d as number) * 50 - (w as number) / 2} y1={(y as number) + 2.5} x2={CX + (d as number) * 50 + (w as number) / 2} y2={(y as number) + 2.5} stroke={ctx.stroke} strokeWidth="0.5" /> : null}
            </g>
          ))
        : null}
      {buttons.map(([x, y], i) => (
        <Button key={i} ctx={ctx} x={x} y={y} r={4.2} />
      ))}
    </g>
  );
}

/* -------------------------------------------------------------------- */
/* Trousers                                                             */
/* -------------------------------------------------------------------- */

function Trousers({ ctx, fill, fabric, back }: { ctx: Ctx; fill: string; fabric: SuitFabric; back: boolean }) {
  const o = ctx.o;
  const fit = o["trousers.fit"] ?? "classic";
  const dims = fit === "slim" ? { outer: 60, inner: 16 } : fit === "relaxed" ? { outer: 72, inner: 6 } : { outer: 66, inner: 11 };
  const top = 352;
  const wb = 13;
  const hemY = 646;
  const crotchY = 444;
  const turnups = o["trousers.hem"] === "turnups";
  const clip = ctx.id(back ? "clipTrBack" : "clipTr");
  const stroke = luminance(fabric.hex) > 0.45 ? "rgba(40,30,20,0.55)" : "rgba(0,0,0,0.55)";
  const seam = luminance(fabric.hex) > 0.45 ? "rgba(40,30,20,0.28)" : "rgba(255,255,255,0.14)";

  const leg = (d: number) => {
    const x = (v: number) => CX + d * v;
    return `M${x(0)} ${top + wb} L${x(70)} ${top + wb} C${x(76)} ${top + 50} ${x(76)} ${top + 80} ${x(74)} ${crotchY} L${x(dims.outer)} ${hemY} L${x(dims.inner)} ${hemY} L${x(3)} ${crotchY + 6} Q${x(1)} ${crotchY} ${x(0)} ${crotchY - 4} Z`;
  };
  const waistband = `M${CX - 71} ${top} L${CX + 71} ${top} L${CX + 71} ${top + wb} L${CX - 71} ${top + wb} Z`;
  const tab = o["trousers.fastening"] === "extended" && !back;
  const pleats = o["trousers.pleats"];
  const waist = o["trousers.waist"];
  const braces = o["trousers.braces"] === "yes";
  const backPockets = o["trousers.backPockets"];

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={leg(-1)} />
          <path d={leg(1)} />
          <path d={waistband} />
        </clipPath>
      </defs>
      <path d={leg(-1)} fill={fill} />
      <path d={leg(1)} fill={fill} />
      <path d={waistband} fill={fill} />
      <g clipPath={`url(#${clip})`} pointerEvents="none">
        <rect x="0" y="0" width="400" height="660" fill={`url(#${ctx.id("bodyShade")})`} />
        <rect x="0" y="0" width="400" height="660" fill={`url(#${ctx.id("vShade")})`} />
        <rect x="0" y="0" width="400" height="660" filter={`url(#${ctx.id("grain")})`} opacity="0.5" />
      </g>
      <path d={leg(-1)} fill="none" stroke={stroke} strokeWidth="0.9" />
      <path d={leg(1)} fill="none" stroke={stroke} strokeWidth="0.9" />
      <path d={waistband} fill="none" stroke={stroke} strokeWidth="0.9" />
      {tab ? (
        <path d={`M${CX} ${top} L${CX + 20} ${top} Q${CX + 24} ${top + wb / 2} ${CX + 20} ${top + wb} L${CX} ${top + wb}`} fill={fill} stroke={stroke} strokeWidth="0.9" />
      ) : null}

      {/* Crease lines */}
      {[-1, 1].map((d) => (
        <line key={d} x1={CX + d * 34} y1={top + wb + 2} x2={CX + d * ((dims.outer + dims.inner) / 2)} y2={hemY - 2} stroke={seam} strokeWidth="0.8" />
      ))}

      {!back ? (
        <g>
          {/* Fly */}
          <path d={`M${CX - 5} ${top + wb} L${CX - 5} ${top + 62} Q${CX - 5} ${top + 72} ${CX + 1} ${top + 76}`} fill="none" stroke={seam} strokeWidth="0.9" />
          <line x1={CX} y1={top + wb} x2={CX} y2={crotchY - 4} stroke={stroke} strokeWidth="0.6" />
          {o["trousers.fastening"] === "hidden" ? null : <Button ctx={ctx} x={tab ? CX + 15 : CX} y={top + wb / 2} r={3.4} />}
          {/* Pleats */}
          {pleats !== "none"
            ? [-1, 1].map((d) => (
                <g key={d} stroke={stroke} strokeWidth="0.8">
                  <line x1={CX + d * 30} y1={top + wb} x2={CX + d * 31} y2={top + 56} />
                  {pleats === "double" ? <line x1={CX + d * 44} y1={top + wb} x2={CX + d * 45} y2={top + 44} /> : null}
                </g>
              ))
            : null}
          {/* Side pockets */}
          {[-1, 1].map((d) =>
            o["trousers.sidePockets"] === "seam" ? (
              <line key={d} x1={CX + d * 72.5} y1={top + wb + 8} x2={CX + d * 75} y2={top + 60} stroke={stroke} strokeWidth="1" />
            ) : (
              <line key={d} x1={CX + d * 56} y1={top + wb} x2={CX + d * 73} y2={top + 58} stroke={stroke} strokeWidth="1" />
            ),
          )}
          {/* Braces buttons */}
          {braces ? [-56, -34, 34, 56].map((x) => <circle key={x} cx={CX + x} cy={top + 4} r="1.8" fill={ctx.buttonHex} stroke="rgba(0,0,0,0.4)" strokeWidth="0.4" />) : null}
        </g>
      ) : (
        <g>
          <path d={`M${CX - 4} ${top} L${CX} ${top + wb} L${CX + 4} ${top}`} fill="none" stroke={stroke} strokeWidth="0.8" />
          <line x1={CX} y1={top + wb} x2={CX} y2={crotchY - 2} stroke={stroke} strokeWidth="0.7" />
          {backPockets !== "none"
            ? [-1, 1]
                .filter((d) => backPockets !== "jetted1" || d === 1)
                .map((d) => {
                  const x = CX + d * 38;
                  const y = top + 42;
                  return backPockets === "flap2" ? (
                    <g key={d}>
                      <rect x={x - 18} y={y} width={36} height={12} fill={fill} stroke={stroke} strokeWidth="0.8" />
                      <Button ctx={ctx} x={x} y={y + 7} r={2.6} />
                    </g>
                  ) : (
                    <g key={d}>
                      <rect x={x - 18} y={y} width={36} height={4} fill={fill} stroke={stroke} strokeWidth="0.8" />
                      <Button ctx={ctx} x={x} y={y + 9} r={2.6} />
                    </g>
                  );
                })
            : null}
        </g>
      )}

      {/* Waist details */}
      {waist === "loops" && getOptionValue("accents.belt", o["accents.belt"] ?? "none")?.hex ? (
        <g>
          <rect x={CX - 72} y={top + 3} width="144" height="7" fill={getOptionValue("accents.belt", o["accents.belt"]!)!.hex} stroke="rgba(0,0,0,0.45)" strokeWidth="0.5" />
          {!back ? <rect x={CX - 7} y={top + 1.5} width="10" height="10" fill="none" stroke="#b8a46a" strokeWidth="1.6" /> : null}
        </g>
      ) : null}
      {waist === "loops"
        ? [-64, -40, 40, 64].concat(back ? [0] : []).map((x) => (
            <rect key={x} x={CX + x - 1.6} y={top - 1.5} width="3.2" height={wb + 4} fill={fill} stroke={stroke} strokeWidth="0.6" />
          ))
        : null}
      {waist === "adjusters"
        ? [-1, 1].map((d) => (
            <g key={d}>
              <rect x={CX + d * 64 - 8} y={top + 3.5} width="16" height="6" fill={fill} stroke={stroke} strokeWidth="0.7" />
              <rect x={CX + d * 64 + (d === 1 ? -9 : 3)} y={top + 2.5} width="6" height="8" fill="none" stroke="#b8bcc2" strokeWidth="1.4" />
            </g>
          ))
        : null}
      {waist === "active"
        ? [-1, 1].map((d) => (
            <path key={d} d={`M${CX + d * 60} ${top + 3} q2 2 0 4 q-2 2 0 4`} stroke={stroke} strokeWidth="0.7" fill="none" />
          ))
        : null}

      {/* Hems */}
      {[-1, 1].map((d) => {
        const x1 = CX + d * dims.inner;
        const x2 = CX + d * dims.outer;
        return (
          <g key={d}>
            {turnups ? (
              <g>
                <line x1={x1} y1={hemY - 12} x2={x2} y2={hemY - 12} stroke={stroke} strokeWidth="0.9" />
                <rect x={Math.min(x1, x2)} y={hemY - 12} width={Math.abs(x2 - x1)} height={12} fill="#000" opacity="0.06" />
              </g>
            ) : null}
            {o["trousers.break"] !== "none" ? (
              <path d={`M${x1 + d * 6} ${hemY - 22} Q${(x1 + x2) / 2} ${hemY - (o["trousers.break"] === "full" ? 30 : 26)} ${x2 - d * 6} ${hemY - 22}`} fill="none" stroke={seam} strokeWidth="0.8" />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
