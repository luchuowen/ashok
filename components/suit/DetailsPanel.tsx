"use client";

import { GROUP_BY_ID, LINING_COLOURS, MONOGRAM_FONTS, THREAD_COLOURS } from "@/lib/suit/catalogue";
import { NOTES_MAX, isGroupApplicable, sanitizeMonogram } from "@/lib/suit/rules";
import type { MonogramSpec, PaletteColour, SuitConfig } from "@/lib/suit/types";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";
import { OptionTiles } from "./OptionTiles";

function PaletteGrid({
  colours,
  selected,
  onSelect,
  currency,
  label,
}: {
  colours: PaletteColour[];
  selected: string;
  onSelect: (id: string) => void;
  currency: DisplayCurrency;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8">
      {colours.map((c) => {
        const active = c.id === selected;
        const bg =
          c.kind === "stripe"
            ? `repeating-linear-gradient(90deg, ${c.accentHex} 0 3px, ${c.hex} 3px 8px)`
            : c.kind && c.accentHex
              ? `radial-gradient(circle at 30% 30%, ${c.accentHex} 0 18%, transparent 19%), radial-gradient(circle at 72% 68%, ${c.accentHex} 0 14%, transparent 15%), ${c.hex}`
              : c.hex;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(c.id)}
            title={`${c.name}${c.price ? ` (+${formatMoney(c.price, currency)})` : ""}`}
            className={`group flex flex-col items-center gap-1 ${active ? "text-ink" : "text-muted"}`}
          >
            <span className={`block aspect-square w-full border-2 ${active ? "border-oxblood" : "border-line group-hover:border-ink/40"}`} style={{ background: bg }} />
            <span className="w-full truncate text-center text-[10px] leading-tight">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Step 3 — linings, buttons, threads, monogram, finishing and notes. */
export function DetailsPanel({
  config,
  onOption,
  onPatch,
  currency,
  advanced,
}: {
  config: SuitConfig;
  onOption: (groupId: string, valueId: string) => void;
  onPatch: (patch: Partial<SuitConfig>) => void;
  currency: DisplayCurrency;
  advanced: boolean;
}) {
  const o = config.options;
  const tiles = (id: string) => {
    const g = GROUP_BY_ID[id];
    if (!g || !isGroupApplicable(id, config)) return null;
    if (g.advanced && !advanced) return null;
    return <OptionTiles key={id} group={g} config={config} onChange={onOption} currency={currency} />;
  };
  const mono: MonogramSpec = config.monogram ?? sanitizeMonogram(null);
  const setMono = (patch: Partial<MonogramSpec>) => onPatch({ monogram: sanitizeMonogram({ ...mono, ...patch }) });
  const monoInvalid = o["accents.monogram"] === "yes" && !mono.text;

  return (
    <div>
      <h3 className="pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-oxblood">Lining</h3>
      {tiles("accents.liningStyle")}
      {tiles("accents.liningColour")}
      {isGroupApplicable("accents.liningColour", config) && o["accents.liningColour"] === "custom" ? (
        <div className="pb-5">
          <PaletteGrid colours={LINING_COLOURS} selected={config.lining} onSelect={(id) => onPatch({ lining: id })} currency={currency} label="Lining colour" />
          <p className="mt-2 text-[11px] text-muted">Prints — paisley, kitenge and geometric — add a small surcharge shown on hover.</p>
        </div>
      ) : null}

      <h3 className="border-t border-line pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-oxblood">Buttons & threads</h3>
      {tiles("accents.buttons")}
      {tiles("accents.buttonholes")}
      {o["accents.buttonholes"] !== "matched" ? (
        <div className="pb-5">
          <p className="mb-2 text-xs text-muted">Thread colour</p>
          <PaletteGrid colours={THREAD_COLOURS} selected={config.thread} onSelect={(id) => onPatch({ thread: id })} currency={currency} label="Buttonhole thread colour" />
        </div>
      ) : null}

      <h3 className="border-t border-line pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-oxblood">Personal touches</h3>
      {tiles("accents.monogram")}
      {o["accents.monogram"] === "yes" ? (
        <div className="space-y-4 pb-5">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Initials (up to 4 letters)</span>
            <input
              value={mono.text}
              onChange={(e) => setMono({ text: e.target.value })}
              maxLength={4}
              placeholder="e.g. ASK"
              aria-invalid={monoInvalid}
              className={`w-40 border bg-paper px-3 py-2 text-lg uppercase tracking-[0.3em] focus:outline-none ${monoInvalid ? "border-oxblood" : "border-line focus:border-oxblood"}`}
              style={{ fontFamily: MONOGRAM_FONTS.find((f) => f.id === mono.font)?.css }}
            />
            {monoInvalid ? <span className="mt-1 block text-[11px] text-oxblood">Enter your initials, or switch the monogram off.</span> : null}
          </label>
          <div>
            <span className="mb-1 block text-xs text-muted">Style</span>
            <div className="flex gap-2">
              {MONOGRAM_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMono({ font: f.id })}
                  aria-pressed={mono.font === f.id}
                  className={`border px-3 py-1.5 text-base ${mono.font === f.id ? "border-ink bg-paper ring-1 ring-ink" : "border-line hover:border-ink/60"}`}
                  style={{ fontFamily: f.css }}
                >
                  {mono.text || "ABC"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-xs text-muted">Placement</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["lining", "Inside lining"],
                  ["collar", "Under the collar"],
                  ["cuff", "Left cuff"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMono({ placement: id })}
                  aria-pressed={mono.placement === id}
                  className={`border px-3 py-1.5 text-xs ${mono.placement === id ? "border-ink bg-ink text-cream" : "border-line hover:border-ink/60"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-xs text-muted">Thread</span>
            <PaletteGrid colours={THREAD_COLOURS} selected={mono.thread} onSelect={(id) => setMono({ thread: id })} currency={currency} label="Monogram thread colour" />
          </div>
        </div>
      ) : null}
      {tiles("accents.pickStitch")}
      {tiles("accents.underCollar")}
      {tiles("accents.elbowPatches")}

      <h3 className="border-t border-line pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-oxblood">Accessories</h3>
      {tiles("accents.pocketSquare")}
      {tiles("accents.necktie")}
      {tiles("accents.bowtie")}
      {tiles("accents.braces")}
      {tiles("accents.belt")}

      <h3 className="border-t border-line pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-oxblood">Make & notes</h3>
      {tiles("suit.service")}
      <label className="block border-t border-line py-5">
        <span className="mb-1 block text-sm font-medium">Notes for the cutter</span>
        <span className="mb-2 block text-xs text-muted">Anything we should know — a wedding date, a posture detail, a reference photo you&rsquo;ll bring.</span>
        <textarea
          value={config.notes}
          onChange={(e) => onPatch({ notes: e.target.value.slice(0, NOTES_MAX) })}
          rows={3}
          className="w-full border border-line bg-paper px-3 py-2 text-sm focus:border-oxblood focus:outline-none"
        />
        <span className="mt-1 block text-right text-[11px] text-muted">
          {config.notes.length}/{NOTES_MAX}
        </span>
      </label>
    </div>
  );
}
