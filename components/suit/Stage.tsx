"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SuitConfig } from "@/lib/suit/types";
import { SuitPreview, type PreviewView } from "./SuitPreview";

const VIEW_LABELS: Record<PreviewView, string> = {
  front: "Front",
  back: "Back",
  lining: "Inside",
  waistcoat: "Waistcoat",
};

/** Close-up widths for the full-screen zoom, smallest first. */
const ZOOM_WIDTHS = ["min(170vw, 1000px)", "min(260vw, 1700px)", "min(380vw, 2500px)"];

function JacketIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M8 3 5 5 3 21h7l2-9 2 9h7L19 5l-3-2-4 7z" strokeLinejoin="round" />
      {hidden ? null : <path d="M3 3l18 18" />}
    </svg>
  );
}

/**
 * The preview stage: view switcher (front / back / inside / waistcoat),
 * hide-jacket toggle, and a full-screen close-up zoom (white overlay,
 * scrollable, +/− levels, Esc or × to close).
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
  const [hideJacket, setHideJacket] = useState(false);
  const views: PreviewView[] = hideJacket ? ["front", "back"] : three ? ["front", "back", "lining", "waistcoat"] : ["front", "back", "lining"];
  const current = views.includes(view) ? view : "front";
  const [zoomOpen, setZoomOpen] = useState(false);

  const step = (dir: 1 | -1) => {
    const i = views.indexOf(current);
    onViewChange(views[(i + dir + views.length) % views.length]!);
  };

  const label = `${hideJacket ? "Without the jacket, " : ""}${VIEW_LABELS[current].toLowerCase()} view of your suit`;

  return (
    <div className="relative flex h-full w-full flex-col">
      <div
        className="relative flex-1 cursor-zoom-in overflow-hidden"
        onClick={() => setZoomOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Open a close-up of the preview"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setZoomOpen(true);
          }
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div className="absolute inset-0">
          <SuitPreview config={config} view={current} hideJacket={hideJacket} className="h-full w-full" title={label} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1 sm:px-4">
        <button type="button" onClick={() => step(-1)} className="flex h-9 w-9 flex-none items-center justify-center border border-line bg-paper text-lg text-ink hover:border-ink" aria-label="Previous view">
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
              className={`border px-2 py-1 text-[11px] uppercase tracking-wide transition-colors sm:px-2.5 ${v === current ? "border-ink bg-ink text-cream" : "border-line bg-paper text-muted hover:text-ink"}`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => step(1)} className="flex h-9 w-9 flex-none items-center justify-center border border-line bg-paper text-lg text-ink hover:border-ink" aria-label="Next view">
          ›
        </button>
      </div>
      {/* Phone: compact icon controls over the preview */}
      <div className="absolute right-2 top-2 flex flex-col gap-1 sm:hidden">
        <button
          type="button"
          onClick={() => setHideJacket((h) => !h)}
          aria-pressed={hideJacket}
          aria-label={hideJacket ? "Show jacket" : "Hide jacket"}
          className={`flex h-9 w-9 items-center justify-center border ${hideJacket ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink"}`}
        >
          <JacketIcon hidden={hideJacket} />
        </button>
        <button type="button" onClick={() => setZoomOpen(true)} aria-label="Zoom" className="flex h-9 w-9 items-center justify-center border border-line bg-paper text-lg leading-none text-ink">
          +
        </button>
      </div>
      <div className="hidden items-center justify-center gap-2 px-2 pb-3 sm:flex sm:px-4">
        <button
          type="button"
          onClick={() => setHideJacket((h) => !h)}
          aria-pressed={hideJacket}
          className={`flex h-9 items-center gap-1.5 border px-3 text-[11px] uppercase tracking-wide transition-colors ${hideJacket ? "border-ink bg-ink text-cream" : "border-line bg-paper text-muted hover:text-ink"}`}
        >
          <JacketIcon hidden={hideJacket} />
          {hideJacket ? "Show jacket" : "Hide jacket"}
        </button>
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          className="flex h-9 items-center gap-1.5 border border-line bg-paper px-3 text-[11px] uppercase tracking-wide text-muted hover:text-ink"
        >
          <span aria-hidden="true" className="text-sm leading-none">+</span> Zoom
        </button>
      </div>
      {caption ? <p className="pointer-events-none absolute left-3 top-3 max-w-[60%] text-[11px] uppercase tracking-wide text-muted">{caption}</p> : null}

      {zoomOpen ? (
        <ZoomOverlay
          config={config}
          views={views}
          view={current}
          onViewChange={onViewChange}
          hideJacket={hideJacket}
          onHideJacket={setHideJacket}
          onClose={() => setZoomOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ZoomOverlay({
  config,
  views,
  view,
  onViewChange,
  hideJacket,
  onHideJacket,
  onClose,
}: {
  config: SuitConfig;
  views: PreviewView[];
  view: PreviewView;
  onViewChange: (v: PreviewView) => void;
  hideJacket: boolean;
  onHideJacket: (h: boolean) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState(0);
  const [progress, setProgress] = useState({ top: 0, size: 1 });
  const scroller = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const size = Math.min(1, el.clientHeight / Math.max(1, el.scrollHeight));
    const max = el.scrollHeight - el.clientHeight;
    setProgress({ top: max > 0 ? (el.scrollTop / max) * (1 - size) : 0, size });
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setLevel((l) => Math.min(ZOOM_WIDTHS.length - 1, l + 1));
      if (e.key === "-") setLevel((l) => Math.max(0, l - 1));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measure);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
    };
  }, [onClose, measure]);

  // Keep the garment centred horizontally when a zoom level is wider than the screen.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      measure();
    });
  }, [level, view, hideJacket, measure]);

  const tool = "flex h-9 items-center justify-center border px-2.5 text-[11px] uppercase tracking-wide backdrop-blur";
  const off = `${tool} border-line bg-white/90 text-ink hover:border-ink`;
  const on = `${tool} border-ink bg-ink text-cream`;

  return (
    <div className="fixed inset-0 z-[70] bg-white" role="dialog" aria-modal="true" aria-label="Close-up of your suit">
      <div ref={scroller} onScroll={measure} className="h-full w-full overflow-auto overscroll-contain">
        <div className="mx-auto" style={{ width: ZOOM_WIDTHS[level] }}>
          <SuitPreview
            config={config}
            view={view}
            hideJacket={hideJacket}
            className="block h-auto w-full"
            title={`Close-up, ${VIEW_LABELS[view].toLowerCase()} view${hideJacket ? " without the jacket" : ""}`}
          />
        </div>
      </div>

      <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close the close-up" className="fixed right-3 top-3 flex h-11 w-11 items-center justify-center text-3xl font-light leading-none text-ink hover:text-oxblood sm:right-5 sm:top-5">
        ×
      </button>

      <div className="fixed left-3 top-3 flex flex-wrap gap-1 pr-16 sm:left-5 sm:top-5">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === view}
            onClick={() => onViewChange(v)}
            className={v === view ? on : off}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      <div className="fixed bottom-7 right-3 flex flex-col gap-1 sm:right-5">
        <button type="button" onClick={() => setLevel((l) => Math.min(ZOOM_WIDTHS.length - 1, l + 1))} disabled={level === ZOOM_WIDTHS.length - 1} aria-label="Zoom in" className={`${off} w-9 text-base disabled:opacity-40`}>
          +
        </button>
        <button type="button" onClick={() => setLevel((l) => Math.max(0, l - 1))} disabled={level === 0} aria-label="Zoom out" className={`${off} w-9 text-base disabled:opacity-40`}>
          −
        </button>
        <button type="button" onClick={() => onHideJacket(!hideJacket)} aria-pressed={hideJacket} aria-label={hideJacket ? "Show jacket" : "Hide jacket"} title={hideJacket ? "Show jacket" : "Hide jacket"} className={`${hideJacket ? on : off} w-9`}>
          <JacketIcon hidden={hideJacket} />
        </button>
      </div>

      {/* Scroll position indicator */}
      <div className="pointer-events-none fixed bottom-3 left-1/2 h-1 w-24 -translate-x-1/2 bg-line" aria-hidden="true">
        <div className="absolute left-0 h-full bg-ink transition-[top,width]" style={{ left: `${progress.top * 100}%`, width: `${progress.size * 100}%` }} />
      </div>
    </div>
  );
}
