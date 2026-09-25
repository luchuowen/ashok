/**
 * Option-tile illustrations: fine technical line drawings of the garment
 * (a tailor's flat sketch), one per choice. Original artwork drawn for Ashok in
 * the house's hairline style: dark outer lines, soft grey construction lines.
 * Unknown keys render nothing and the tile falls back to its label alone.
 */
import type React from "react";

const INK = "currentColor";
const SOFT = "#a3a09a";
const L = { fill: "none", stroke: INK, strokeWidth: 1.05, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const G = { ...L, stroke: SOFT, strokeWidth: 0.8 };

type Closure = "sb1" | "sb2" | "sb3" | "db4" | "db6" | "mandarin";
type Lapel = "notch" | "peak" | "shawl";
type Pocket = "flap" | "jetted" | "patch" | "none";

const btn = (x: number, y: number, r = 1.25) => <circle key={`${x}:${y}`} cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth={0.9} />;

/** Front view of a jacket in a 64 x 72 box. */
function Jacket({ closure = "sb2", lapel = "notch", pocket = "flap", ghost = false }: { closure?: Closure; lapel?: Lapel; pocket?: Pocket; ghost?: boolean }) {
  const db = closure === "db4" || closure === "db6";
  const mand = closure === "mandarin";
  const topY = mand ? 14 : closure === "sb1" ? 40 : closure === "sb3" ? 30 : db ? 33 : 35; // lapel roll point
  const rx = db ? 38 : 32; // x where the fronts meet
  const body = (
    <>
      {/* shoulders, sides, hem */}
      <path {...L} d={`M24 9 Q17 11 12 13 Q9 15 9 19 L9 22 M40 9 Q47 11 52 13 Q55 15 55 19 L55 22`} />
      <path {...L} d={`M13 23 L14 58 Q22 61 ${db ? 26 : 30} 61 M51 23 L50 58 Q42 61 ${db ? 38 : 34} 61`} />
      {/* sleeves */}
      <path {...L} d="M9 19 Q7 38 8 61 L14 61 L15 30 M55 19 Q57 38 56 61 L50 61 L49 30" />
      <path {...G} d="M8.4 56 L14 56 M55.6 56 L50 56" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          {btn(12.6 - i * 0.2, 58.6 - i * 1.9, 0.55)}
          {btn(51.4 + i * 0.2, 58.6 - i * 1.9, 0.55)}
        </g>
      ))}
      {/* back collar seen inside */}
      <path {...G} d="M24 9 Q32 12 40 9" />
    </>
  );

  let front: React.ReactNode;
  if (mand) {
    front = (
      <>
        <path {...L} d="M24 9 L24 5.5 Q32 3.5 40 5.5 L40 9 Q32 11.5 24 9 Z" />
        <path {...L} d="M32 11 L32 60" />
        {[18, 26, 34, 42, 50].map((y) => btn(32, y))}
      </>
    );
  } else {
    const noteL =
      lapel === "shawl"
        ? `M24 9 Q18 18 20 ${topY - 8} Q24 ${topY - 2} ${rx} ${topY}`
        : lapel === "peak"
          ? `M24 9 L22 15 L15 13 L18 19 Q21 ${topY - 10} ${rx} ${topY}`
          : `M24 9 L22 16 L17 16.5 L19 20 Q22 ${topY - 10} ${rx} ${topY}`;
    const noteR =
      lapel === "shawl"
        ? `M40 9 Q46 18 44 ${topY - 8} Q40 ${topY - 2} ${db ? 26 : 32} ${topY + (db ? 0 : 0)}`
        : lapel === "peak"
          ? `M40 9 L42 15 L49 13 L46 19 Q43 ${topY - 10} ${db ? 26 : 32} ${topY}`
          : `M40 9 L42 16 L47 16.5 L45 20 Q42 ${topY - 10} ${db ? 26 : 32} ${topY}`;
    front = (
      <>
        <path {...L} d={noteL} />
        <path {...L} d={noteR} />
        {/* gorge / collar */}
        {lapel !== "shawl" ? <path {...G} d={`M22 ${lapel === "peak" ? 15 : 16} L24 9 M42 ${lapel === "peak" ? 15 : 16} L40 9`} /> : null}
        {/* shirt V */}
        <path {...G} d={`M26 10 L32 ${Math.min(topY, 26)} L38 10`} />
        {/* front edge + cutaway */}
        {db ? (
          <path {...L} d={`M${rx} ${topY} L${rx} 61`} />
        ) : (
          <path {...L} d={`M${rx} ${topY} L${rx} 52 Q31 58 28 61 M32 52 Q33 58 36 61`} />
        )}
        {/* buttons */}
        {closure === "sb1" ? btn(33.4, 44) : null}
        {closure === "sb2" ? [btn(33.4, 40), btn(33.4, 48)] : null}
        {closure === "sb3" ? [btn(33.4, 33), btn(33.4, 41), btn(33.4, 49)] : null}
        {closure === "db4" ? [btn(27, 40), btn(37, 40), btn(27, 49), btn(37, 49)] : null}
        {closure === "db6" ? [btn(25, 32), btn(39, 32), btn(27, 40), btn(37, 40), btn(27, 49), btn(37, 49)] : null}
      </>
    );
  }

  const pk = (x: number, w: number) => {
    const y = 47;
    if (pocket === "none") return null;
    if (pocket === "jetted") return <path key={x} {...L} d={`M${x} ${y} L${x + w} ${y} M${x} ${y + 1.4} L${x + w} ${y + 1.4}`} strokeWidth={0.8} />;
    if (pocket === "patch") return <path key={x} {...L} d={`M${x} ${y - 1} L${x + w} ${y - 1} L${x + w} ${y + 8} Q${x + w} ${y + 9.5} ${x + w - 1.5} ${y + 9.5} L${x + 1.5} ${y + 9.5} Q${x} ${y + 9.5} ${x} ${y + 8} Z`} />;
    return <path key={x} {...L} d={`M${x - 0.3} ${y} L${x + w + 0.3} ${y} L${x + w} ${y + 4} L${x} ${y + 4} Z`} />;
  };

  return (
    <g opacity={ghost ? 0.4 : 1}>
      {body}
      {front}
      {pk(16, 9)}
      {pk(39, 9)}
      {/* breast pocket */}
      {!mand ? <path {...(pocket === "patch" ? L : G)} d="M40 25 L47 24.4 L47 26.2 L40 26.8 Z" /> : null}
    </g>
  );
}

function Trousers({ y = 0, x = 0, scale = 1, hatch = false, pleats = 0 }: { y?: number; x?: number; scale?: number; hatch?: boolean; pleats?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {hatch ? (
        <>
          <defs>
            <pattern id="og-hatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
              <path d="M0 0 L0 2.4" stroke={SOFT} strokeWidth="0.7" />
            </pattern>
          </defs>
          <path d="M20 4 L44 4 L47 66 L35 66 L32 24 L29 66 L17 66 Z" fill="url(#og-hatch)" />
        </>
      ) : null}
      <path {...L} d="M20 4 L44 4 L47 66 L35 66 L32 24 L29 66 L17 66 Z" />
      <path {...L} d="M20 4 L20 9 L44 9 L44 4" />
      <path {...G} d="M32 9 L32 22 M24.5 10 L24.5 66 M39.5 10 L39.5 66" />
      <path {...G} d="M21 12 L25 18 M43 12 L39 18" />
      {pleats >= 1 ? <path {...L} d="M27 9 L27 17 M37 9 L37 17" strokeWidth={0.8} /> : null}
      {pleats >= 2 ? <path {...L} d="M29 9 L29 14 M35 9 L35 14" strokeWidth={0.8} /> : null}
      {btn(32, 6.5, 0.9)}
    </g>
  );
}

function Waistcoat({ db = false, six = false }: { db?: boolean; six?: boolean }) {
  const ys = db ? [30, 38, 46] : six ? [24, 30, 36, 42, 48, 54] : [26, 33, 40, 47, 54];
  return (
    <g>
      <path {...L} d="M22 8 Q17 11 16 16 Q18 26 13 30 L13 58 L26 64 L32 60 L38 64 L51 58 L51 30 Q46 26 48 16 Q47 11 42 8" />
      <path {...L} d={db ? "M22 8 L28 26 L38 30 M42 8 L38 30 L38 62" : "M22 8 L32 22 L42 8 M32 22 L32 60"} />
      <path {...G} d="M16 16 Q22 12 22 8 M48 16 Q42 12 42 8" />
      <path {...G} d="M18 44 L27 43 M37 43 L46 44 M19 28 L26 27 M38 27 L45 28" />
      {db ? ys.flatMap((y) => [btn(28, y), btn(42, y)]) : ys.map((y) => btn(32, y))}
    </g>
  );
}

function JacketBack({ vent }: { vent: "none" | "centre" | "side" }) {
  return (
    <g>
      <path {...L} d="M24 9 Q17 11 12 13 Q9 15 9 19 Q7 38 8 61 L14 61 L15 30 M40 9 Q47 11 52 13 Q55 15 55 19 Q57 38 56 61 L50 61 L49 30" />
      <path {...L} d="M13 23 L14 60 L50 60 L51 23" />
      <path {...L} d="M24 9 Q32 6 40 9 L40 12 Q32 10 24 12 Z" />
      <path {...G} d="M32 12 L32 60 M22 22 Q20 40 20 60 M42 22 Q44 40 44 60" />
      {vent === "centre" ? <path {...L} d="M32 44 L32 60 M32 44 L33.6 46 L33.6 60" /> : null}
      {vent === "side" ? <path {...L} d="M20 45 L20 60 M44 45 L44 60 M20 45 L21.6 47 L21.6 60 M44 45 L42.4 47 L42.4 60" /> : null}
    </g>
  );
}

const V = (children: React.ReactNode, vb = "0 0 64 72") => ({ vb, children });

const GLYPHS: Record<string, { vb: string; children: React.ReactNode }> = {
  "pieces-two": V(
    <>
      <g transform="translate(-6 0) scale(0.78)">
        <Jacket />
      </g>
      <g transform="translate(26 16) scale(0.62)">
        <Trousers />
      </g>
    </>,
  ),
  "pieces-three": V(
    <>
      <g transform="translate(-8 0) scale(0.72)">
        <Jacket ghost />
      </g>
      <g transform="translate(6 6) scale(0.6)">
        <Waistcoat />
      </g>
      <g transform="translate(30 18) scale(0.58)">
        <Trousers />
      </g>
    </>,
  ),
  "fabric-same": V(
    <>
      <g transform="translate(-4 2) scale(0.74)">
        <Jacket />
      </g>
      <g transform="translate(28 16) scale(0.6)">
        <Trousers />
      </g>
    </>,
  ),
  "fabric-mixed": V(
    <>
      <g transform="translate(-4 2) scale(0.74)">
        <Jacket />
      </g>
      <g transform="translate(28 16) scale(0.6)">
        <Trousers hatch />
      </g>
    </>,
  ),
  "closure-sb1": V(<Jacket closure="sb1" />),
  "closure-sb2": V(<Jacket closure="sb2" />),
  "closure-sb3": V(<Jacket closure="sb3" />),
  "closure-db4": V(<Jacket closure="db4" lapel="peak" />),
  "closure-db6": V(<Jacket closure="db6" lapel="peak" />),
  "closure-mandarin": V(<Jacket closure="mandarin" />),
  "lapel-notch": V(<Jacket lapel="notch" />),
  "lapel-peak": V(<Jacket lapel="peak" />),
  "lapel-shawl": V(<Jacket closure="sb1" lapel="shawl" />),
  "pocket-flap": V(<Jacket pocket="flap" />),
  "pocket-jetted": V(<Jacket pocket="jetted" />),
  "pocket-patch": V(<Jacket pocket="patch" />),
  "pocket-none": V(<Jacket pocket="none" />),
  "vent-none": V(<JacketBack vent="none" />),
  "vent-centre": V(<JacketBack vent="centre" />),
  "vent-side": V(<JacketBack vent="side" />),
  "pleat-none": V(<Trousers x={0} y={2} pleats={0} />),
  "pleat-single": V(<Trousers x={0} y={2} pleats={1} />),
  "pleat-double": V(<Trousers x={0} y={2} pleats={2} />),
  "vest-sb5": V(<Waistcoat />),
  "vest-sb6": V(<Waistcoat six />),
  "vest-db6": V(<Waistcoat db />),
};

export function OptionGlyph({ name, className = "" }: { name?: string; className?: string }) {
  const g = name ? GLYPHS[name] : undefined;
  if (!g) return null;
  return (
    <svg viewBox={g.vb} className={className} aria-hidden="true">
      {g.children}
    </svg>
  );
}

export function hasGlyph(name?: string): boolean {
  return Boolean(name && GLYPHS[name]);
}
