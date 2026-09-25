/**
 * Option-tile illustrations: fine technical flat sketches of the garment,
 * one per choice. Original artwork drawn for Ashok: single-weight hairlines,
 * true garment proportions (long jacket, sloped shoulders, sleeves hanging
 * beside the body). Stroke is currentColor so tiles can grey out unselected
 * options and ink the selected one. Unknown keys render nothing.
 */
import type React from "react";

const SW = 0.75;
const L = { fill: "none", stroke: "currentColor", strokeWidth: SW, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const FILL_SOFT = "rgba(20,18,15,0.10)";

type Closure = "sb1" | "sb2" | "sb3" | "db4" | "db6" | "mandarin";
type Lapel = "notch" | "peak" | "shawl";
type Pocket = "flap" | "jetted" | "patch" | "none";

/* Jacket drawn in a 60 x 80 box: neck at y 6, hem at ~y 72. */
const NECK_L = 25;
const NECK_R = 35;
const SH_Y = 12;

const button = (x: number, y: number, r = 1) => <circle key={`${x}:${y}`} cx={x} cy={y} r={r} {...L} />;
const hole = (x: number, y: number, dir: 1 | -1 = -1) => <path key={`h${x}:${y}`} {...L} d={`M${x + dir * 1.8} ${y} L${x + dir * 4} ${y}`} />;

function Shell({ collar = true }: { collar?: boolean }) {
  return (
    <g>
      {/* shoulders */}
      <path {...L} d={`M${NECK_L} 6 Q18.6 8 12.6 ${SH_Y} Q10.8 13.6 10.5 17.5`} />
      <path {...L} d={`M${NECK_R} 6 Q41.4 8 47.4 ${SH_Y} Q49.2 13.6 49.5 17.5`} />
      {/* sleeves: outer edge, cuff, inner edge */}
      <path {...L} d="M10.5 17.5 Q9.4 41 10 66 L15.1 66.5 Q15.4 45 16.2 27" />
      <path {...L} d="M49.5 17.5 Q50.6 41 50 66 L44.9 66.5 Q44.6 45 43.8 27" />
      {/* body sides under the arm */}
      <path {...L} d="M16.2 27 Q16.6 52 16.4 73.5" />
      <path {...L} d="M43.8 27 Q43.4 52 43.6 73.5" />
      {collar ? <path {...L} d={`M${NECK_L} 6 Q30 4.4 ${NECK_R} 6 Q30 8.4 ${NECK_L} 6`} /> : null}
    </g>
  );
}

function Jacket({ closure = "sb2", lapel = "notch", pocket = "flap", vest = false }: { closure?: Closure; lapel?: Lapel; pocket?: Pocket; vest?: boolean }) {
  const db = closure === "db4" || closure === "db6";
  const mand = closure === "mandarin";
  // roll point (where the lapels end / top button)
  const roll = closure === "sb1" ? 45 : closure === "sb3" ? 34 : db ? 40 : 40;
  const edgeX = db ? 36.5 : 31; // x of the overlapping front edge

  let front: React.ReactNode;
  if (mand) {
    front = (
      <g>
        <path {...L} d={`M${NECK_L} 6 L${NECK_L - 0.4} 2.6 Q30 1.2 ${NECK_R + 0.4} 2.6 L${NECK_R} 6`} />
        <path {...L} d="M30 6.6 L30 74" />
        <path {...L} d="M30 74 Q23 75.2 16.4 73.5 M30 74 Q37 75.2 43.6 73.5" />
        {[15, 27, 39, 51, 63].map((y) => button(31.6, y, 0.9))}
      </g>
    );
  } else {
    // lapel outline for the wearer's right side (viewer left) and left (viewer right)
    const gorge = 17;
    const lapelLeft =
      lapel === "shawl"
        ? `M${NECK_L} 6 Q20 14 21.5 26 Q23.5 ${roll - 6} ${edgeX - 1} ${roll}`
        : lapel === "peak"
          ? `M${NECK_L} 6 L23.4 ${gorge} L18.6 ${gorge - 3.6} L20.4 ${gorge + 3.4} Q22 ${roll - 10} ${edgeX - 1} ${roll}`
          : `M${NECK_L} 6 L23.2 ${gorge} L19.6 ${gorge + 0.6} L21 ${gorge + 3.4} Q22.4 ${roll - 10} ${edgeX - 1} ${roll}`;
    const lapelRight =
      lapel === "shawl"
        ? `M${NECK_R} 6 Q40 14 38.5 26 Q37 ${roll - 8} ${db ? 25 : 31} ${db ? roll - 8 : roll}`
        : lapel === "peak"
          ? `M${NECK_R} 6 L36.6 ${gorge} L41.4 ${gorge - 3.6} L39.6 ${gorge + 3.4} Q38.2 ${roll - 12} ${db ? 25 : 31} ${db ? roll - 8 : roll}`
          : `M${NECK_R} 6 L36.8 ${gorge} L40.4 ${gorge + 0.6} L39 ${gorge + 3.4} Q37.8 ${roll - 12} ${db ? 25 : 31} ${db ? roll - 8 : roll}`;
    front = (
      <g>
        <path {...L} d={lapelLeft} />
        <path {...L} d={lapelRight} />
        {/* shirt / inside V */}
        <path {...L} d={`M${NECK_L + 1.4} 6.8 L30 ${Math.min(roll - 8, 24)} L${NECK_R - 1.4} 6.8`} opacity={0.4} />
        {vest ? <path {...L} d={`M27 10.5 L30 ${roll - 11} L33 10.5`} /> : null}
        {vest ? [button(30, roll - 8, 0.7), button(30, roll - 4.2, 0.7)] : null}
        {/* front edge and hem */}
        {db ? (
          <path {...L} d={`M${edgeX - 1} ${roll} L${edgeX - 1} 74 Q28 75.4 16.4 73.5 M${edgeX - 1} 74 L43.6 73.5`} />
        ) : (
          <path {...L} d={`M30 ${roll} L30 63 Q29.4 70 22.4 74 Q19 74.3 16.4 73.5 M30.6 ${roll} L30.6 63 Q31.4 70 37.6 74 Q41 74.3 43.6 73.5`} />
        )}
        {closure === "sb1" ? [button(31.4, roll + 1.6), hole(30, roll + 1.6)] : null}
        {closure === "sb2" ? [button(31.4, roll + 1.6), button(31.4, roll + 11), hole(30, roll + 11)] : null}
        {closure === "sb3" ? [button(31.4, roll + 1.8), button(31.4, roll + 11), button(31.4, roll + 20)] : null}
        {closure === "db4" ? [button(27.4, roll + 2), button(33.6, roll + 2), button(27.4, roll + 10), button(33.6, roll + 10), hole(26, roll + 10)] : null}
        {closure === "db6" ? [button(25.6, roll - 6), button(35.4, roll - 6), button(27.4, roll + 2), button(33.6, roll + 2), button(27.4, roll + 10), button(33.6, roll + 10)] : null}
      </g>
    );
  }

  const pk = (x: number, key: string) => {
    const w = 7.4;
    const y = 56;
    if (pocket === "none") return null;
    if (pocket === "jetted") return <path key={key} {...L} d={`M${x} ${y} L${x + w} ${y} M${x} ${y + 0.9} L${x + w} ${y + 0.9}`} />;
    if (pocket === "patch") return <path key={key} {...L} d={`M${x} ${y - 1} L${x + w} ${y - 1} L${x + w} ${y + 7} Q${x + w} ${y + 8.4} ${x + w - 1.4} ${y + 8.4} L${x + 1.4} ${y + 8.4} Q${x} ${y + 8.4} ${x} ${y + 7} Z`} />;
    return <path key={key} {...L} d={`M${x - 0.2} ${y} L${x + w + 0.2} ${y} L${x + w} ${y + 2.8} L${x} ${y + 2.8} Z`} />;
  };

  return (
    <g>
      <Shell collar={!mand} />
      {front}
      {pk(19.2, "l")}
      {pk(33.4, "r")}
      {!mand ? <path {...L} d={pocket === "patch" ? "M36 25.6 L41.2 25.6 L41.2 30 L36 30 Z" : "M36 27 L41.4 26.4"} /> : null}
    </g>
  );
}

function Trousers({ soft = false, pleats = 0 }: { soft?: boolean; pleats?: number }) {
  // 30 x 80 box
  const outline = "M4 4 L26 4 L27.5 76 L18 76 L15 22 L12 76 L2.5 76 Z";
  return (
    <g>
      {soft ? <path d={outline} fill={FILL_SOFT} stroke="none" /> : null}
      <path {...L} d={outline} />
      <path {...L} d="M4 4 L4 8.4 L26 8.4 L26 4" />
      <path {...L} d="M15 8.4 L15 20" />
      <path {...L} d="M5.2 11 Q7.6 14 8.4 18 M24.8 11 Q22.4 14 21.6 18" />
      {pleats >= 1 ? <path {...L} d="M11.4 8.4 L11.6 16 M18.6 8.4 L18.4 16" /> : null}
      {pleats >= 2 ? <path {...L} d="M9.6 8.4 L9.8 13 M20.4 8.4 L20.2 13" /> : null}
      <path {...L} d="M8 9 L8 76 M22 9 L22 76" opacity={0.35} />
    </g>
  );
}

function Waistcoat({ db = false, six = false }: { db?: boolean; six?: boolean }) {
  const ys = db ? [34, 42, 50] : six ? [27, 33, 39, 45, 51, 57] : [30, 37, 44, 51, 58];
  return (
    <g>
      <path {...L} d="M23 8 Q19 11 16.5 15 Q17.6 23 14 28 L14 60 L27 68 L30 64 L33 68 L46 60 L46 28 Q42.4 23 43.5 15 Q41 11 37 8" />
      <path {...L} d={db ? "M23 8 L27.6 30 L36 34 M37 8 L36 34 L36 66" : "M23 8 L30 25 L37 8 M30 25 L30 64"} />
      <path {...L} d="M17.6 50 L25 49.4 M35 49.4 L42.4 50 M18.4 31 L24 30.4 M36 30.4 L41.6 31" opacity={0.7} />
      {db ? ys.flatMap((y) => [button(27.6, y, 0.95), button(38.4, y, 0.95)]) : ys.map((y) => button(31.4, y, 0.95))}
    </g>
  );
}

function JacketBack({ vent }: { vent: "none" | "centre" | "side" }) {
  return (
    <g>
      <Shell collar={false} />
      <path {...L} d={`M${NECK_L} 6 Q30 3.6 ${NECK_R} 6 L${NECK_R + 0.4} 9 Q30 7 ${NECK_L - 0.4} 9 Z`} />
      <path {...L} d="M16.4 73.5 Q30 74.6 43.6 73.5" />
      <path {...L} d="M30 8 L30 73.8" opacity={0.6} />
      <path {...L} d="M21 24 Q20 48 21 74 M39 24 Q40 48 39 74" opacity={0.45} />
      {vent === "centre" ? <path {...L} d="M30 55 L30 74 M30 55 L31.4 57 L31.4 74" /> : null}
      {vent === "side" ? <path {...L} d="M16.6 55 L18 57 L18 73.6 M43.4 55 L42 57 L42 73.6" /> : null}
    </g>
  );
}

type Glyph = { vb: string; body: React.ReactNode };
const J = (props: Parameters<typeof Jacket>[0]): Glyph => ({ vb: "0 0 60 80", body: <Jacket {...props} /> });

const GLYPHS: Record<string, Glyph> = {
  "pieces-two": {
    vb: "0 0 90 80",
    body: (
      <>
        <Jacket />
        <g transform="translate(58 0)">
          <Trousers />
        </g>
      </>
    ),
  },
  "pieces-three": {
    vb: "0 0 90 80",
    body: (
      <>
        <Jacket vest />
        <g transform="translate(58 0)">
          <Trousers />
        </g>
      </>
    ),
  },
  "fabric-same": {
    vb: "0 0 90 80",
    body: (
      <>
        <Jacket />
        <g transform="translate(58 0)">
          <Trousers />
        </g>
      </>
    ),
  },
  "fabric-mixed": {
    vb: "0 0 90 80",
    body: (
      <>
        <Jacket />
        <g transform="translate(58 0)">
          <Trousers soft />
        </g>
      </>
    ),
  },
  "closure-sb1": J({ closure: "sb1" }),
  "closure-sb2": J({ closure: "sb2" }),
  "closure-sb3": J({ closure: "sb3" }),
  "closure-db4": J({ closure: "db4", lapel: "peak" }),
  "closure-db6": J({ closure: "db6", lapel: "peak" }),
  "closure-mandarin": J({ closure: "mandarin" }),
  "lapel-notch": J({ lapel: "notch" }),
  "lapel-peak": J({ lapel: "peak" }),
  "lapel-shawl": J({ closure: "sb1", lapel: "shawl" }),
  "pocket-flap": J({ pocket: "flap" }),
  "pocket-jetted": J({ pocket: "jetted" }),
  "pocket-patch": J({ pocket: "patch" }),
  "pocket-none": J({ pocket: "none" }),
  "vent-none": { vb: "0 0 60 80", body: <JacketBack vent="none" /> },
  "vent-centre": { vb: "0 0 60 80", body: <JacketBack vent="centre" /> },
  "vent-side": { vb: "0 0 60 80", body: <JacketBack vent="side" /> },
  "pleat-none": { vb: "-15 0 60 80", body: <Trousers pleats={0} /> },
  "pleat-single": { vb: "-15 0 60 80", body: <Trousers pleats={1} /> },
  "pleat-double": { vb: "-15 0 60 80", body: <Trousers pleats={2} /> },
  "vest-sb5": { vb: "0 0 60 80", body: <Waistcoat /> },
  "vest-sb6": { vb: "0 0 60 80", body: <Waistcoat six /> },
  "vest-db6": { vb: "0 0 60 80", body: <Waistcoat db /> },
};

export function OptionGlyph({ name, className = "" }: { name?: string; className?: string }) {
  const g = name ? GLYPHS[name] : undefined;
  if (!g) return null;
  return (
    <svg viewBox={g.vb} className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {g.body}
    </svg>
  );
}

export function glyphIsWide(name?: string): boolean {
  return Boolean(name && GLYPHS[name]?.vb.startsWith("0 0 90"));
}

export function hasGlyph(name?: string): boolean {
  return Boolean(name && GLYPHS[name]);
}
