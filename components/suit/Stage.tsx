"use client";

import { useRef, useState } from "react";
import type { SuitConfig } from "@/lib/suit/types";
import { SuitPreview, type PreviewView } from "./SuitPreview";

const VIEW_LABELS: Record<PreviewView, string> = {
  front: "Front",
  back: "Back",
  lining: "Inside",
  waistcoat: "Waistcoat",
};

/**
 * The preview stage: view switcher (front / back / inside / waistcoat),
 * click-to-zoom with pointer panning, and keyboard-accessible controls.
 */
export function Stage({
  config,
  view,
  onViewChange,
  caption,
}: {
  config: SuitConfig;
  view: PreviewView;
  onViewChange: (v: PreviewView) => void;
  caption?: string;
}) {
  const three = config.options["suit.pieces"] === "three";
  const views: PreviewView[] = three ? ["front", "back", "lining", "waistcoat"] : ["front", "back", "lining"];
  const current = views.includes(view) ? view : "front";
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 35 });
  const boxRef = useRef<HTMLDivElement>(null);

  function track(e: React.PointerEvent) {
    if (!zoom || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setOrigin({
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    });
  }

  const step = (dir: 1 | -1) => {
    const i = views.indexOf(current);
    onViewChange(views[(i + dir + views.length) % views.length]!);
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      <div
        ref={boxRef}
        className={`relative flex-1 overflow-hidden ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onPointerMove={track}
        onPointerDown={track}
        onClick={(e) => {
          track(e as unknown as React.PointerEvent);
          setZoom((z) => !z);
        }}
        role="button"
        tabIndex={0}
        aria-label={zoom ? "Zoom out of the preview" : "Zoom into the preview"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setZoom((z) => !z);
          }
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: zoom ? "scale(2.1)" : "scale(1)", transformOrigin: `${origin.x}% ${origin.y}%` }}
        >
          <SuitPreview config={config} view={current} className="h-full w-full" title={`${VIEW_LABELS[current]} view of your suit`} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1 sm:px-4">
        <button type="button" onClick={() => step(-1)} className="flex h-9 w-9 flex-none items-center justify-center border border-line bg-cream text-lg text-ink hover:border-ink" aria-label="Previous view">
          ‹
        </button>
        <div className="flex min-w-0 flex-1 justify-center gap-1" role="tablist" aria-label="Preview view">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === current}
              onClick={() => onViewChange(v)}
              className={`border px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors ${v === current ? "border-ink bg-ink text-cream" : "border-line bg-cream text-muted hover:text-ink"}`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => step(1)} className="flex h-9 w-9 flex-none items-center justify-center border border-line bg-cream text-lg text-ink hover:border-ink" aria-label="Next view">
          ›
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          className="hidden h-9 flex-none items-center justify-center border border-line bg-cream px-2.5 text-[11px] uppercase tracking-wide text-muted hover:text-ink sm:flex"
          aria-pressed={zoom}
        >
          {zoom ? "− Zoom" : "+ Zoom"}
        </button>
      </div>
      {caption ? <p className="pointer-events-none absolute left-3 top-3 max-w-[60%] text-[11px] uppercase tracking-wide text-muted">{caption}</p> : null}
    </div>
  );
}
