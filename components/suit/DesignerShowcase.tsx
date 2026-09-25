"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultConfig, getFabric } from "@/lib/suit/catalogue";
import { normalizeConfig } from "@/lib/suit/rules";
import { priceSuit } from "@/lib/suit/pricing";
import { formatKes } from "@/lib/currency";
import type { SuitConfig } from "@/lib/suit/types";
import { OptionGlyph } from "./OptionGlyph";
import { SuitPreview } from "./SuitPreview";

/**
 * "Choose your suit" — a self-playing demo of the designer inside a device
 * frame. A cursor walks through real choices (cloth, closure, lapel, lining);
 * the preview and the live price update exactly as they do in the designer,
 * because it renders the same components from the same catalogue.
 * Plays only while on screen; reduced-motion users get a still frame.
 */

type Tab = "Fabric" | "Style" | "Accents";
type Step = { tab: Tab; target: string; label: string; apply: (c: SuitConfig) => SuitConfig };

const FABRICS = ["classic-navy-s110", "fab-charcoal-wool", "classic-navy-pinstripe", "classic-olive-twill", "fab-oatmeal-linen", "premium-glencheck"];
const CLOSURES = [
  { id: "sb1", label: "1 button", glyph: "closure-sb1" },
  { id: "sb2", label: "2 buttons", glyph: "closure-sb2" },
  { id: "db4", label: "Double 4", glyph: "closure-db4" },
  { id: "db6", label: "Double 6", glyph: "closure-db6" },
  { id: "mandarin", label: "Mandarin", glyph: "closure-mandarin" },
];
const LAPELS = [
  { id: "notch", label: "Notch", glyph: "lapel-notch" },
  { id: "peak", label: "Peak", glyph: "lapel-peak" },
  { id: "shawl", label: "Shawl", glyph: "lapel-shawl" },
];
const LININGS = [
  { id: "oxblood", hex: "#7a2f24" },
  { id: "navy", hex: "#1c2a4a" },
  { id: "gold", hex: "#b08a3e" },
  { id: "kitenge-indigo", hex: "#2e3f7f" },
];

const opt = (k: string, v: string) => (c: SuitConfig) => normalizeConfig({ ...c, options: { ...c.options, [k]: v } }, k).config;
const fab = (id: string) => (c: SuitConfig) => normalizeConfig({ ...c, fabric: id }).config;
const lin = (id: string) => (c: SuitConfig) =>
  normalizeConfig({ ...c, lining: id, options: { ...c.options, "accents.liningColour": "custom" } }).config;

const SCRIPT: Step[] = [
  { tab: "Fabric", target: "fab:fab-charcoal-wool", label: "Charcoal wool", apply: fab("fab-charcoal-wool") },
  { tab: "Fabric", target: "fab:classic-navy-pinstripe", label: "Navy pinstripe", apply: fab("classic-navy-pinstripe") },
  { tab: "Style", target: "cl:db6", label: "Double-breasted, 6 buttons", apply: opt("jacket.closure", "db6") },
  { tab: "Style", target: "lp:peak", label: "Peak lapels", apply: opt("jacket.lapel", "peak") },
  { tab: "Fabric", target: "fab:classic-olive-twill", label: "Olive twill", apply: fab("classic-olive-twill") },
  { tab: "Style", target: "cl:sb1", label: "Single button", apply: opt("jacket.closure", "sb1") },
  { tab: "Style", target: "lp:shawl", label: "Shawl collar", apply: opt("jacket.lapel", "shawl") },
  { tab: "Accents", target: "ln:oxblood", label: "Oxblood lining", apply: lin("oxblood") },
  { tab: "Fabric", target: "fab:fab-oatmeal-linen", label: "Oatmeal linen", apply: fab("fab-oatmeal-linen") },
  { tab: "Style", target: "cl:sb2", label: "Two buttons", apply: opt("jacket.closure", "sb2") },
  { tab: "Style", target: "lp:notch", label: "Notch lapels", apply: opt("jacket.lapel", "notch") },
  { tab: "Fabric", target: "fab:classic-navy-s110", label: "Navy Super 110s", apply: fab("classic-navy-s110") },
];

const START = (() => {
  const c = defaultConfig();
  return normalizeConfig({ ...c, fabric: "classic-navy-s110", options: { ...c.options, "jacket.closure": "sb2", "jacket.lapel": "notch" } }).config;
})();

export function DesignerShowcase() {
  const [config, setConfig] = useState<SuitConfig>(START);
  const [step, setStep] = useState(-1);
  const [tab, setTab] = useState<Tab>("Fabric");
  const [cursor, setCursor] = useState<{ x: number; y: number; down: boolean }>({ x: 70, y: 70, down: false });
  const [live, setLive] = useState(false);
  const [changed, setChanged] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const price = useMemo(() => priceSuit(config).unitTotal, [config]);

  // Play only while visible, never for reduced motion.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => setLive(Boolean(e?.isIntersecting)), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    const next = (step + 1) % SCRIPT.length;
    const s = SCRIPT[next]!;
    const timers: number[] = [];
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    at(600, () => setTab(s.tab));
    at(1100, () => {
      const box = panel.current;
      const t = box?.querySelector<HTMLElement>(`[data-t="${s.target}"]`);
      if (box && t) {
        const b = box.getBoundingClientRect();
        const r = t.getBoundingClientRect();
        setCursor({ x: ((r.left + r.width / 2 - b.left) / b.width) * 100, y: ((r.top + r.height / 2 - b.top) / b.height) * 100, down: false });
      }
    });
    at(2000, () => setCursor((c) => ({ ...c, down: true })));
    at(2150, () => {
      setConfig((c) => s.apply(c));
      setChanged(s.label);
    });
    at(2350, () => setCursor((c) => ({ ...c, down: false })));
    at(3600, () => setStep(next));
    return () => timers.forEach(clearTimeout);
  }, [live, step]);

  const o = config.options;
  const Tile = ({ t, active, children }: { t: string; active: boolean; children: React.ReactNode }) => (
    <div data-t={t} className={`flex flex-col items-center gap-1 border px-1 pb-1.5 pt-2 text-center text-[9px] leading-tight transition-colors duration-300 sm:text-[10px] ${active ? "border-ink bg-white ring-1 ring-ink" : "border-line bg-white/60 text-muted"}`}>
      {children}
    </div>
  );

  return (
    <div ref={root} className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
      <div className="text-center lg:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-oxblood">The designer</p>
        <h2 className="mt-3 text-4xl md:text-5xl">Choose your suit, detail by detail</h2>
        <p className="mx-auto mt-5 max-w-md text-base text-muted lg:mx-0">
          Pick the cloth, the cut, the lapel, the lining — every choice appears on the suit as you make it, with the price beside it. No
          guesswork, no surprises at your fitting.
        </p>
        <ul className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-left text-sm lg:mx-0">
          {["28 cloths from Italy, England & Turkey", "Lapels, pockets, vents, buttons", "Linings, monograms, contrast thread", "Saved to your record"].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 h-1 w-1 flex-none bg-oxblood" />
              {t}
            </li>
          ))}
        </ul>
        <Link href="/custom-suits/design" className="cta mt-8 inline-flex">
          Design your suit
        </Link>
      </div>

      {/* Device frame */}
      <div className="relative">
        <div className="border-[10px] border-ink bg-ink shadow-[0_30px_60px_-30px_rgba(20,18,15,0.45)] sm:border-[14px]">
          <div ref={panel} className="relative grid aspect-[16/11] grid-cols-[38%_1fr] overflow-hidden bg-[#f3f1ec]" aria-hidden="true">
            {/* options column */}
            <div className="flex flex-col border-r border-line bg-[#fbfaf7] p-2.5 sm:p-4">
              <div className="mb-3 flex gap-3 border-b border-line pb-2 text-[9px] uppercase tracking-[0.15em] sm:text-[10px]">
                {(["Fabric", "Style", "Accents"] as Tab[]).map((t) => (
                  <span key={t} className={`relative pb-1 transition-colors ${tab === t ? "text-ink" : "text-muted"}`}>
                    {t}
                    <span className={`absolute inset-x-0 -bottom-[9px] h-0.5 bg-oxblood transition-opacity duration-300 ${tab === t ? "opacity-100" : "opacity-0"}`} />
                  </span>
                ))}
              </div>
              <div className="relative min-h-0 flex-1">
                <div className={`absolute inset-0 grid grid-cols-3 content-start gap-1.5 transition-opacity duration-300 ${tab === "Fabric" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                  {FABRICS.map((id) => {
                    const f = getFabric(id)!;
                    return (
                      <div key={id} data-t={`fab:${id}`} className={`transition-shadow duration-300 ${config.fabric === id ? "ring-2 ring-ink ring-offset-1" : ""}`}>
                        <div className="aspect-square bg-cover" style={{ backgroundImage: `url(/textures/fabrics/${id}.jpg)`, backgroundColor: f.hex }} />
                        <p className="mt-0.5 truncate text-[8px] text-muted sm:text-[9px]">{f.name}</p>
                      </div>
                    );
                  })}
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${tab === "Style" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                  <p className="mb-1 text-[9px] text-muted sm:text-[10px]">Closure</p>
                  <div className="grid grid-cols-3 gap-1">
                    {CLOSURES.slice(0, 5).map((c) => (
                      <Tile key={c.id} t={`cl:${c.id}`} active={o["jacket.closure"] === c.id}>
                        <OptionGlyph name={c.glyph} className="h-6 w-6 sm:h-8 sm:w-8" />
                        {c.label}
                      </Tile>
                    ))}
                  </div>
                  <p className="mb-1 mt-2 text-[9px] text-muted sm:text-[10px]">Lapel</p>
                  <div className="grid grid-cols-3 gap-1">
                    {LAPELS.map((l) => (
                      <Tile key={l.id} t={`lp:${l.id}`} active={o["jacket.lapel"] === l.id}>
                        <OptionGlyph name={l.glyph} className="h-6 w-6 sm:h-8 sm:w-8" />
                        {l.label}
                      </Tile>
                    ))}
                  </div>
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${tab === "Accents" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                  <p className="mb-1.5 text-[9px] text-muted sm:text-[10px]">Lining colour</p>
                  <div className="flex flex-wrap gap-2">
                    {LININGS.map((l) => (
                      <span key={l.id} data-t={`ln:${l.id}`} className={`h-6 w-6 rounded-full border border-line sm:h-7 sm:w-7 ${config.lining === l.id && o["accents.liningColour"] === "custom" ? "ring-2 ring-ink ring-offset-1" : ""}`} style={{ background: l.hex }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* preview column */}
            <div className="relative">
              <div className="absolute inset-[6%_28%_6%_4%]">
                <SuitPreview config={config} view={tab === "Accents" ? "lining" : "front"} className="h-full w-full" title="" />
              </div>
              <div className="absolute right-[4%] top-[18%] w-[32%] text-right">
                <p className="font-display text-[11px] leading-tight sm:text-lg">Your custom suit</p>
                <p className="mt-1 whitespace-nowrap font-display text-sm tabular-nums sm:text-xl lg:text-2xl">{formatKes(price)}</p>
                <p className="mt-2 min-h-[2.2em] text-[8px] leading-tight text-muted transition-opacity sm:text-[10px]" key={changed}>
                  {changed ? `✓ ${changed}` : "Made in Nairobi"}
                </p>
                <span className="mt-2 inline-block bg-ink px-2 py-1 text-[8px] uppercase tracking-wide text-cream sm:px-3 sm:py-1.5 sm:text-[10px]">Next</span>
              </div>
            </div>

            {/* cursor */}
            <div
              className="pointer-events-none absolute z-10 transition-[left,top] duration-700 ease-[cubic-bezier(.45,0,.2,1)]"
              style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
            >
              <span className={`absolute -left-3 -top-3 h-6 w-6 rounded-full bg-ink/15 transition-transform duration-200 ${cursor.down ? "scale-150 opacity-100" : "scale-50 opacity-0"}`} />
              <svg width="16" height="20" viewBox="0 0 16 20" className={`transition-transform duration-150 ${cursor.down ? "scale-90" : ""}`}>
                <path d="M1 1l13 8.5-6 1.2 3.4 7.3-2.4 1.1-3.4-7.3L1 16z" fill="#14120f" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
