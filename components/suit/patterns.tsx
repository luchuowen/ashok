import type { PaletteColour, SuitFabric } from "@/lib/suit/types";
import { shade } from "./color";

/**
 * Procedural cloth patterns for the SVG preview. Each returns an SVG
 * <pattern> filled with the cloth's colour and weave/print structure, so a
 * new fabric only needs `pattern` + colours in the catalogue to render.
 */
export function FabricPattern({ id, fabric, scale = 1 }: { id: string; fabric: SuitFabric; scale?: number }) {
  const base = fabric.hex;
  const acc = fabric.accentHex ?? shade(base, 0.15);
  const lt = shade(base, 0.1);
  const dk = shade(base, -0.18);
  const t = (n: number) => n * scale;

  switch (fabric.pattern) {
    case "twill":
      return (
        <pattern id={id} width={t(4)} height={t(4)} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={t(4)} height={t(4)} fill={base} />
          <rect width={t(1.2)} height={t(4)} fill={lt} opacity="0.45" />
        </pattern>
      );
    case "melange":
      return (
        <pattern id={id} width={t(6)} height={t(6)} patternUnits="userSpaceOnUse">
          <rect width={t(6)} height={t(6)} fill={base} />
          <circle cx={t(1)} cy={t(1.5)} r={t(0.7)} fill={acc} opacity="0.6" />
          <circle cx={t(4)} cy={t(4.2)} r={t(0.6)} fill={dk} opacity="0.5" />
          <circle cx={t(4.6)} cy={t(1)} r={t(0.5)} fill={lt} opacity="0.6" />
          <circle cx={t(2)} cy={t(4.8)} r={t(0.5)} fill={acc} opacity="0.5" />
        </pattern>
      );
    case "birdseye":
      return (
        <pattern id={id} width={t(4)} height={t(4)} patternUnits="userSpaceOnUse">
          <rect width={t(4)} height={t(4)} fill={base} />
          <circle cx={t(1)} cy={t(1)} r={t(0.55)} fill={acc} />
          <circle cx={t(3)} cy={t(3)} r={t(0.55)} fill={acc} />
        </pattern>
      );
    case "herringbone":
      return (
        <pattern id={id} width={t(10)} height={t(6)} patternUnits="userSpaceOnUse">
          <rect width={t(10)} height={t(6)} fill={base} />
          <path d={`M0 ${t(6)} L${t(5)} 0 M${t(5)} 0 L${t(10)} ${t(6)}`} stroke={acc} strokeWidth={t(1.4)} opacity="0.55" />
          <path d={`M0 0 L${t(1)} ${t(-1.2)} M${t(9)} ${t(-1.2)} L${t(10)} 0`} stroke={acc} strokeWidth={t(1.4)} opacity="0.55" />
        </pattern>
      );
    case "houndstooth": {
      const s = t(10);
      return (
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <rect width={s} height={s} fill={acc} />
          <path
            d={`M0 0 H${s / 2} L${s} ${s / 2} V${s} L${s / 2} ${s / 2} H0 Z M${s / 2} ${s / 2} L${s / 4} ${s * 0.75} L0 ${s / 2} Z M${s / 2} 0 L${s * 0.75} ${-s / 4} L${s} 0 L${s} ${s * 0.25}Z`}
            fill={base}
          />
        </pattern>
      );
    }
    case "pinstripe":
      return (
        <pattern id={id} width={t(9)} height={t(9)} patternUnits="userSpaceOnUse">
          <rect width={t(9)} height={t(9)} fill={base} />
          <rect x={t(4.2)} width={t(0.45)} height={t(9)} fill={acc} opacity="0.85" />
        </pattern>
      );
    case "chalkstripe":
      return (
        <pattern id={id} width={t(14)} height={t(14)} patternUnits="userSpaceOnUse">
          <rect width={t(14)} height={t(14)} fill={base} />
          <rect x={t(6.4)} width={t(1.3)} height={t(14)} fill={acc} opacity="0.45" />
        </pattern>
      );
    case "glencheck": {
      const s = t(24);
      return (
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <rect width={s} height={s} fill={base} />
          <g opacity="0.35" stroke={shade(base, -0.35)} strokeWidth={t(0.6)}>
            {[1, 3, 5, 7, 9, 11].map((i) => (
              <line key={`v${i}`} x1={t(i)} y1={0} x2={t(i)} y2={t(12)} />
            ))}
            {[13, 15, 17, 19, 21, 23].map((i) => (
              <line key={`h${i}`} x1={t(12)} y1={t(i)} x2={s} y2={t(i)} />
            ))}
            {[1, 3, 5, 7, 9, 11].map((i) => (
              <line key={`hh${i}`} x1={0} y1={t(i)} x2={t(12)} y2={t(i)} />
            ))}
          </g>
          <line x1={t(18)} y1={0} x2={t(18)} y2={s} stroke={acc} strokeWidth={t(0.7)} opacity="0.8" />
          <line x1={0} y1={t(18)} x2={s} y2={t(18)} stroke={acc} strokeWidth={t(0.7)} opacity="0.8" />
        </pattern>
      );
    }
    case "windowpane": {
      const s = t(26);
      return (
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <rect width={s} height={s} fill={base} />
          <line x1={t(13)} y1={0} x2={t(13)} y2={s} stroke={acc} strokeWidth={t(0.6)} opacity="0.75" />
          <line x1={0} y1={t(13)} x2={s} y2={t(13)} stroke={acc} strokeWidth={t(0.6)} opacity="0.75" />
        </pattern>
      );
    }
    case "corduroy":
      return (
        <pattern id={id} width={t(2.4)} height={t(4)} patternUnits="userSpaceOnUse">
          <rect width={t(2.4)} height={t(4)} fill={base} />
          <rect width={t(0.8)} height={t(4)} fill={dk} opacity="0.6" />
          <rect x={t(1.4)} width={t(0.5)} height={t(4)} fill={lt} opacity="0.4" />
        </pattern>
      );
    case "linen":
      return (
        <pattern id={id} width={t(12)} height={t(12)} patternUnits="userSpaceOnUse">
          <rect width={t(12)} height={t(12)} fill={base} />
          <g stroke={acc} strokeWidth={t(0.5)} opacity="0.55">
            <line x1={0} y1={t(2)} x2={t(12)} y2={t(2)} />
            <line x1={0} y1={t(7.5)} x2={t(7)} y2={t(7.5)} />
            <line x1={t(3)} y1={0} x2={t(3)} y2={t(12)} />
            <line x1={t(9)} y1={t(4)} x2={t(9)} y2={t(12)} />
          </g>
          <line x1={t(5)} y1={t(10.2)} x2={t(11)} y2={t(10.2)} stroke={shade(base, 0.25)} strokeWidth={t(0.7)} opacity="0.6" />
        </pattern>
      );
    case "donegal": {
      const flecks: [number, number, string][] = [
        [2, 3, acc], [9, 7, "#c9b35a"], [14, 2, lt], [5, 12, acc], [16, 14, "#4f7a5e"], [11, 17, lt], [18, 9, acc], [1, 17, "#c9b35a"],
      ];
      return (
        <pattern id={id} width={t(20)} height={t(20)} patternUnits="userSpaceOnUse">
          <rect width={t(20)} height={t(20)} fill={base} />
          {flecks.map(([x, y, c], i) => (
            <rect key={i} x={t(x)} y={t(y)} width={t(1.1)} height={t(0.7)} fill={c} opacity="0.85" />
          ))}
        </pattern>
      );
    }
    case "flannel":
    case "velvet":
    case "solid":
    default:
      return (
        <pattern id={id} width={t(6)} height={t(6)} patternUnits="userSpaceOnUse">
          <rect width={t(6)} height={t(6)} fill={base} />
          <rect x={t(1)} y={t(2)} width={t(0.6)} height={t(0.6)} fill={lt} opacity="0.25" />
          <rect x={t(4)} y={t(4.5)} width={t(0.6)} height={t(0.6)} fill={dk} opacity="0.25" />
        </pattern>
      );
  }
}

export function LiningPattern({ id, colour }: { id: string; colour: PaletteColour }) {
  const base = colour.hex;
  const acc = colour.accentHex ?? shade(base, 0.2);
  switch (colour.kind) {
    case "paisley":
      return (
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill={base} />
          <path d="M6 12 C2 8 6 2 11 5 C15 8 12 14 8 15 C10 12 9 10 7 11 Z" fill={acc} opacity="0.8" />
          <circle cx="17" cy="17" r="1.6" fill={acc} opacity="0.7" />
          <circle cx="17" cy="4" r="1" fill={acc} opacity="0.7" />
        </pattern>
      );
    case "kitenge":
      return (
        <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={base} />
          <circle cx="10" cy="10" r="6" fill="none" stroke={acc} strokeWidth="2" />
          <circle cx="10" cy="10" r="2.2" fill={acc} />
          <path d="M0 0 L4 0 L0 4 Z M20 20 L16 20 L20 16 Z M20 0 L20 4 L16 0Z M0 20 L0 16 L4 20Z" fill={acc} />
        </pattern>
      );
    case "geometric":
      return (
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={base} />
          <path d="M7 1 L13 7 L7 13 L1 7 Z" fill="none" stroke={acc} strokeWidth="0.9" />
        </pattern>
      );
    case "stripe":
      return (
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={base} />
          <rect width="3" height="8" fill={acc} opacity="0.85" />
        </pattern>
      );
    default:
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="6" height="6" fill={base} />
          <rect width="1" height="6" fill={shade(base, 0.12)} opacity="0.5" />
        </pattern>
      );
  }
}
