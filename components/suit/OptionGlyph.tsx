/**
 * Line-drawn icons for option tiles (the Hockerty-style "pictogram" grid),
 * drawn in the house's hairline style. Unknown keys render nothing and the
 * tile falls back to its label alone.
 */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Jacket({ children, db = false, mandarin = false }: { children?: React.ReactNode; db?: boolean; mandarin?: boolean }) {
  return (
    <g {...S}>
      <path d="M22 8 L14 11 L9 18 L8 50 L25 52 M34 8 L42 11 L47 18 L48 50 L31 52" />
      <path d="M14 11 L10 46 M42 11 L46 46" opacity="0.5" />
      {mandarin ? <path d="M22 8 Q28 5 34 8 L34 5 Q28 2 22 5 Z M28 8 L28 52" /> : db ? <path d="M22 8 L24 30 L34 8 M24 30 L24 52" /> : <path d="M22 8 L28 30 L34 8 M28 30 L28 44 Q27 50 22 52 M28 44 Q29 50 34 52" />}
      {children}
    </g>
  );
}

const dot = (x: number, y: number) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" stroke="none" />;

const GLYPHS: Record<string, React.ReactNode> = {
  "pieces-two": (
    <g {...S}>
      <path d="M10 8 L20 6 L28 12 L36 6 L46 8 L48 30 L8 30 Z" />
      <path d="M16 34 L40 34 L42 52 L31 52 L28 40 L25 52 L14 52 Z" />
    </g>
  ),
  "pieces-three": (
    <g {...S}>
      <path d="M8 8 L18 6 L24 12 L30 6 L40 8 L42 30 L6 30 Z" opacity="0.5" />
      <path d="M22 10 L28 20 L34 10 L44 14 L46 32 L28 36 L10 32 L12 14 Z" />
      {dot(28, 24)}
      {dot(28, 29)}
      <path d="M16 38 L40 38 L42 54 L31 54 L28 44 L25 54 L14 54 Z" />
    </g>
  ),
  "fabric-same": (
    <g {...S}>
      <rect x="10" y="10" width="16" height="36" />
      <rect x="30" y="10" width="16" height="36" />
      <path d="M10 20 L26 20 M10 30 L26 30 M30 20 L46 20 M30 30 L46 30" opacity="0.4" />
    </g>
  ),
  "fabric-mixed": (
    <g {...S}>
      <rect x="10" y="10" width="16" height="36" />
      <rect x="30" y="10" width="16" height="36" />
      <path d="M10 20 L26 20 M10 30 L26 30" opacity="0.4" />
      <path d="M34 10 L34 46 M38 10 L38 46 M42 10 L42 46" opacity="0.4" />
    </g>
  ),
  "closure-sb1": <Jacket>{dot(28, 34)}</Jacket>,
  "closure-sb2": <Jacket>{[dot(28, 32), dot(28, 40)]}</Jacket>,
  "closure-sb3": <Jacket>{[dot(28, 26), dot(28, 33), dot(28, 40)]}</Jacket>,
  "closure-db4": <Jacket db>{[dot(24, 34), dot(32, 34), dot(24, 42), dot(32, 42)]}</Jacket>,
  "closure-db6": <Jacket db>{[dot(22, 26), dot(34, 26), dot(24, 34), dot(32, 34), dot(24, 42), dot(32, 42)]}</Jacket>,
  "closure-mandarin": <Jacket mandarin>{[dot(28, 16), dot(28, 24), dot(28, 32), dot(28, 40)]}</Jacket>,
  "lapel-notch": (
    <g {...S}>
      <path d="M20 6 L30 44 L36 22 L30 20 L34 14 L26 8" />
      <path d="M30 20 L27 12" opacity="0.5" />
    </g>
  ),
  "lapel-peak": (
    <g {...S}>
      <path d="M20 6 L30 44 L38 16 L32 20 L30 16 L26 8" />
    </g>
  ),
  "lapel-shawl": (
    <g {...S}>
      <path d="M20 6 L30 44 Q40 28 34 14 Q30 8 24 6" />
    </g>
  ),
  "pocket-flap": (
    <g {...S}>
      <path d="M10 22 L46 22 L46 32 Q46 34 44 34 L12 34 Q10 34 10 32 Z" />
      <path d="M10 20 L46 20" opacity="0.5" />
    </g>
  ),
  "pocket-jetted": (
    <g {...S}>
      <rect x="10" y="25" width="36" height="6" />
      <path d="M10 28 L46 28" />
    </g>
  ),
  "pocket-patch": (
    <g {...S}>
      <path d="M12 14 L44 14 L44 40 Q44 44 40 44 L16 44 Q12 44 12 40 Z" />
      <path d="M14 18 L42 18" strokeDasharray="2 2" opacity="0.6" />
    </g>
  ),
  "pocket-none": (
    <g {...S} opacity="0.5">
      <path d="M12 28 L44 28" strokeDasharray="3 3" />
    </g>
  ),
  "vent-none": (
    <g {...S}>
      <path d="M14 8 L42 8 L46 48 L10 48 Z" />
      <path d="M28 8 L28 48" opacity="0.4" />
    </g>
  ),
  "vent-centre": (
    <g {...S}>
      <path d="M14 8 L42 8 L46 48 L10 48 Z" />
      <path d="M28 8 L28 48 M30 34 L30 48 M28 34 L30 32" />
    </g>
  ),
  "vent-side": (
    <g {...S}>
      <path d="M14 8 L42 8 L46 48 L10 48 Z" />
      <path d="M28 8 L28 48" opacity="0.4" />
      <path d="M14 34 L14 48 M42 34 L42 48" />
    </g>
  ),
  "pleat-none": (
    <g {...S}>
      <path d="M12 8 L44 8 L46 50 L33 50 L28 24 L23 50 L10 50 Z" />
    </g>
  ),
  "pleat-single": (
    <g {...S}>
      <path d="M12 8 L44 8 L46 50 L33 50 L28 24 L23 50 L10 50 Z" />
      <path d="M19 8 L19 20 M37 8 L37 20" />
    </g>
  ),
  "pleat-double": (
    <g {...S}>
      <path d="M12 8 L44 8 L46 50 L33 50 L28 24 L23 50 L10 50 Z" />
      <path d="M18 8 L18 20 M22 8 L22 16 M38 8 L38 20 M34 8 L34 16" />
    </g>
  ),
  "vest-sb5": (
    <g {...S}>
      <path d="M20 6 L28 22 L36 6 L44 10 L46 44 L34 48 L28 44 L22 48 L10 44 L12 10 Z" />
      {[dot(28, 26), dot(28, 31), dot(28, 36), dot(28, 41)]}
    </g>
  ),
  "vest-sb6": (
    <g {...S}>
      <path d="M20 6 L28 18 L36 6 L44 10 L46 44 L34 48 L28 44 L22 48 L10 44 L12 10 Z" />
      {[dot(28, 21), dot(28, 25.5), dot(28, 30), dot(28, 34.5), dot(28, 39)]}
    </g>
  ),
  "vest-db6": (
    <g {...S}>
      <path d="M20 6 L25 22 L36 6 L44 10 L46 44 L10 44 L12 10 Z" />
      {[dot(23, 26), dot(33, 26), dot(23, 32), dot(33, 32), dot(23, 38), dot(33, 38)]}
    </g>
  ),
};

export function OptionGlyph({ name, className = "" }: { name?: string; className?: string }) {
  if (!name || !GLYPHS[name]) return null;
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      {GLYPHS[name]}
    </svg>
  );
}

export function hasGlyph(name?: string): boolean {
  return Boolean(name && GLYPHS[name]);
}
