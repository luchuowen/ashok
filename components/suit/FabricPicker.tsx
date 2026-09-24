"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLLECTION_LABELS, SUIT_FABRICS } from "@/lib/suit/catalogue";
import type { FabricCollection, FabricPattern, Occasion, Season, SuitFabric } from "@/lib/suit/types";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";
import { FabricSwatch } from "./FabricSwatch";

type Filters = {
  collection: FabricCollection[];
  colour: SuitFabric["colourFamily"][];
  pattern: string[];
  season: Season[];
  occasion: Occasion[];
  price: string[];
  stretch: boolean;
};

const EMPTY: Filters = { collection: [], colour: [], pattern: [], season: [], occasion: [], price: [], stretch: false };

const PRICE_BANDS = [
  { id: "u40", label: "Under KES 40,000", test: (p: number) => p < 40000 },
  { id: "40-55", label: "KES 40,000 – 55,000", test: (p: number) => p >= 40000 && p <= 55000 },
  { id: "55-70", label: "KES 55,000 – 70,000", test: (p: number) => p > 55000 && p <= 70000 },
  { id: "o70", label: "Over KES 70,000", test: (p: number) => p > 70000 },
];

const PATTERN_GROUPS: { id: string; label: string; patterns: FabricPattern[] }[] = [
  { id: "plain", label: "Plain & twill", patterns: ["solid", "twill", "melange", "flannel", "velvet"] },
  { id: "micro", label: "Micro-pattern", patterns: ["birdseye", "herringbone"] },
  { id: "stripe", label: "Stripes", patterns: ["pinstripe", "chalkstripe"] },
  { id: "check", label: "Checks", patterns: ["glencheck", "windowpane", "houndstooth"] },
  { id: "texture", label: "Texture", patterns: ["linen", "corduroy", "donegal"] },
];

const COLOUR_SWATCH: Record<SuitFabric["colourFamily"], string> = {
  navy: "#1f2a44",
  blue: "#4a6190",
  grey: "#7c7e82",
  charcoal: "#38393c",
  black: "#141416",
  brown: "#5a4636",
  beige: "#cbb89a",
  green: "#5b6a45",
  red: "#6b1f30",
  cream: "#e8dfcc",
};

const SEASON_LABEL: Record<Season, string> = { "year-round": "Year-round", summer: "Warm weather", winter: "Cool season" };
const OCCASION_LABEL: Record<Occasion, string> = { business: "Business", wedding: "Wedding", celebration: "Celebration", "smart-casual": "Smart casual" };

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function FabricPicker({
  selectedId,
  onSelect,
  currency,
  target,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  currency: DisplayCurrency;
  target?: string;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [sheet, setSheet] = useState<SuitFabric | null>(null);

  const available = SUIT_FABRICS.filter((f) => f.available);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter((f) => {
      if (q) {
        const hay = [f.name, f.colourName, f.composition, f.origin, f.pattern, COLLECTION_LABELS[f.collection], ...f.features, ...f.occasions].join(" ").toLowerCase();
        if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
      }
      if (filters.collection.length && !filters.collection.includes(f.collection)) return false;
      if (filters.colour.length && !filters.colour.includes(f.colourFamily)) return false;
      if (filters.pattern.length && !PATTERN_GROUPS.filter((g) => filters.pattern.includes(g.id)).some((g) => g.patterns.includes(f.pattern))) return false;
      if (filters.season.length && !filters.season.includes(f.season)) return false;
      if (filters.occasion.length && !filters.occasion.some((o) => f.occasions.includes(o))) return false;
      if (filters.price.length && !PRICE_BANDS.filter((b) => filters.price.includes(b.id)).some((b) => b.test(f.price))) return false;
      if (filters.stretch && !f.stretch) return false;
      return true;
    });
  }, [available, query, filters]);

  const activeCount =
    filters.collection.length + filters.colour.length + filters.pattern.length + filters.season.length + filters.occasion.length + filters.price.length + (filters.stretch ? 1 : 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search fabrics</span>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, colour, cloth…"
            className="w-full border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink focus:border-oxblood focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          className={`flex items-center gap-2 border px-3 py-2 text-xs uppercase tracking-wide transition-colors ${showFilters || activeCount ? "border-ink text-ink" : "border-line text-muted hover:border-ink hover:text-ink"}`}
        >
          Filters{activeCount ? ` · ${activeCount}` : ""}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {results.length} of {available.length} fabrics{target ? ` · choosing for the ${target}` : ""}
      </p>

      {showFilters ? (
        <div className="mt-3 space-y-4 border border-line bg-paper p-4 text-sm">
          <FilterRow label="Collection">
            {(Object.keys(COLLECTION_LABELS) as FabricCollection[]).map((c) => (
              <Chip key={c} active={filters.collection.includes(c)} onClick={() => setFilters((f) => ({ ...f, collection: toggle(f.collection, c) }))}>
                {COLLECTION_LABELS[c]}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Colour">
            {(Object.keys(COLOUR_SWATCH) as SuitFabric["colourFamily"][])
              .filter((c) => available.some((f) => f.colourFamily === c))
              .map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, colour: toggle(f.colour, c) }))}
                  aria-pressed={filters.colour.includes(c)}
                  title={c}
                  className={`h-7 w-7 rounded-full border-2 ${filters.colour.includes(c) ? "border-oxblood" : "border-line"}`}
                  style={{ background: COLOUR_SWATCH[c] }}
                >
                  <span className="sr-only">{c}</span>
                </button>
              ))}
          </FilterRow>
          <FilterRow label="Pattern">
            {PATTERN_GROUPS.map((g) => (
              <Chip key={g.id} active={filters.pattern.includes(g.id)} onClick={() => setFilters((f) => ({ ...f, pattern: toggle(f.pattern, g.id) }))}>
                {g.label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Season">
            {(Object.keys(SEASON_LABEL) as Season[]).map((s) => (
              <Chip key={s} active={filters.season.includes(s)} onClick={() => setFilters((f) => ({ ...f, season: toggle(f.season, s) }))}>
                {SEASON_LABEL[s]}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Occasion">
            {(Object.keys(OCCASION_LABEL) as Occasion[]).map((o) => (
              <Chip key={o} active={filters.occasion.includes(o)} onClick={() => setFilters((f) => ({ ...f, occasion: toggle(f.occasion, o) }))}>
                {OCCASION_LABEL[o]}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Two-piece price">
            {PRICE_BANDS.map((b) => (
              <Chip key={b.id} active={filters.price.includes(b.id)} onClick={() => setFilters((f) => ({ ...f, price: toggle(f.price, b.id) }))}>
                {b.label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Features">
            <Chip active={filters.stretch} onClick={() => setFilters((f) => ({ ...f, stretch: !f.stretch }))}>
              Comfort stretch
            </Chip>
          </FilterRow>
          <div className="flex justify-between border-t border-line pt-3">
            <button type="button" onClick={() => setFilters(EMPTY)} className="text-xs uppercase tracking-wide text-muted hover:text-oxblood">
              Clear all
            </button>
            <button type="button" onClick={() => setShowFilters(false)} className="text-xs uppercase tracking-wide text-ink hover:text-oxblood">
              Show {results.length} fabrics
            </button>
          </div>
        </div>
      ) : null}

      {results.length === 0 ? (
        <div className="mt-6 border border-dashed border-line p-6 text-center text-sm text-muted">
          No fabric matches those filters.{" "}
          <button type="button" className="underline hover:text-oxblood" onClick={() => { setFilters(EMPTY); setQuery(""); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {results.map((f) => {
            const selected = f.id === selectedId;
            return (
              <li key={f.id}>
                <div className={`group relative border bg-paper transition-colors ${selected ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/50"}`}>
                  <button type="button" onClick={() => onSelect(f.id)} aria-pressed={selected} className="block w-full text-left">
                    <div className="relative aspect-[5/4] overflow-hidden">
                      <FabricSwatch fabric={f} className="transition-transform duration-500 group-hover:scale-105" />
                      {f.badge ? (
                        <span className="absolute left-2 top-2 rounded-tag bg-ink px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-cream">{f.badge}</span>
                      ) : null}
                      {selected ? (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cream text-ink" aria-hidden="true">
                          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 6.5l2.2 2L9.5 3.5" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{f.name}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {COLLECTION_LABELS[f.collection]} · {f.superNumber ? `Super ${f.superNumber}s · ` : ""}
                        {f.weightGsm}g
                      </p>
                      <p className="mt-1 text-xs text-ink">{formatMoney(f.price, currency)}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet(f)}
                    className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center border border-line bg-cream text-[11px] text-muted hover:border-ink hover:text-ink"
                    aria-label={`More about ${f.name}`}
                  >
                    i
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {sheet ? (
        <FabricSheet
          fabric={sheet}
          currency={currency}
          selected={sheet.id === selectedId}
          onClose={() => setSheet(null)}
          onSelect={() => {
            onSelect(sheet.id);
            setSheet(null);
          }}
          onStep={(dir) => {
            const i = results.findIndex((r) => r.id === sheet.id);
            const next = results[(i + dir + results.length) % results.length];
            if (next) setSheet(next);
          }}
        />
      ) : null}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-2.5 py-1 text-xs transition-colors ${active ? "border-ink bg-ink text-cream" : "border-line text-ink hover:border-ink"}`}
    >
      {children}
    </button>
  );
}

function FabricSheet({
  fabric,
  currency,
  selected,
  onClose,
  onSelect,
  onStep,
}: {
  fabric: SuitFabric;
  currency: DisplayCurrency;
  selected: boolean;
  onClose: () => void;
  onSelect: () => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onStep]);

  const rows: [string, string][] = [
    ["Colour", fabric.colourName],
    ["Pattern", fabric.pattern.replace(/^\w/, (c) => c.toUpperCase())],
    ["Composition", fabric.composition],
    ["Weight", `${fabric.weightGsm} g/m²${fabric.weightGsm < 240 ? " · light" : fabric.weightGsm > 300 ? " · heavy" : " · medium"}`],
    ["Origin", fabric.origin],
    ["Season", SEASON_LABEL[fabric.season]],
    ["Suggested for", fabric.occasions.map((o) => OCCASION_LABEL[o]).join(", ")],
    ["Collection", COLLECTION_LABELS[fabric.collection]],
  ];
  if (fabric.superNumber) rows.splice(3, 0, ["Grade", `Super ${fabric.superNumber}s`]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`${fabric.name} details`} onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto bg-cream" onClick={(e) => e.stopPropagation()}>
        <div className="grid sm:grid-cols-2">
          <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[360px]">
            <FabricSwatch fabric={fabric} large />
            <div className="absolute inset-x-0 bottom-0 flex justify-between p-3">
              <button type="button" onClick={() => onStep(-1)} className="flex h-9 w-9 items-center justify-center border border-line bg-cream/90 hover:bg-cream" aria-label="Previous fabric">
                ‹
              </button>
              <button type="button" onClick={() => onStep(1)} className="flex h-9 w-9 items-center justify-center border border-line bg-cream/90 hover:bg-cream" aria-label="Next fabric">
                ›
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-oxblood">Selected fabric</p>
                <h3 className="mt-2 text-2xl">{fabric.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {formatMoney(fabric.price, currency)} <span className="text-xs">· two-piece suit</span>
                </p>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-line text-lg hover:border-ink" aria-label="Close">
                ×
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink">{fabric.description}</p>
            {fabric.features.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {fabric.features.map((feat) => (
                  <span key={feat} className="rounded-tag border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                    {feat}
                  </span>
                ))}
              </div>
            ) : null}
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
            <button type="button" onClick={onSelect} className="cta mt-6 w-full">
              {selected ? "Selected — keep this fabric" : "Choose this fabric"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
