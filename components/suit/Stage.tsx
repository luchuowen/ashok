"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SuitConfig } from "@/lib/suit/types";
import { SuitDrawing, type PreviewView } from "./SuitPreview";
import { SKIN_TONES, type SkinToneId } from "./ModelPreview";
import { DETAIL_CROP, hasPhoto, PhotoPreview } from "./PhotoPreview";
import { DETAIL_FALLBACK, detailPhotoFor, waistcoatPhotoFor } from "@/lib/suit/detail-photos";

/** Stage views: the photographic on-model views plus the flat technical drawings. */
export type StageView = "model" | "modelBack" | PreviewView;

const VIEW_LABELS: Record<StageView, string> = {
  model: "Front",
  modelBack: "Back",
  front: "Detail",
  back: "Back",
  lining: "Inside",
  waistcoat: "Waistcoat",
};

const isPhoto = (v: StageView) => v === "model";

/** Close-up widths for the full-screen zoom, smallest first. Photos top out lower (source resolution). */
const ZOOM_WIDTHS = ["min(170vw, 1000px)", "min(260vw, 1700px)", "min(380vw, 2500px)"];
const MODEL_ZOOM_WIDTHS = ["min(100vw, 900px)", "min(170vw, 1300px)", "min(240vw, 1700px)"];

const SKIN_KEY = "ashok.suit.skinTone";
function readSkin(): SkinToneId {
  try {
    const v = window.localStorage.getItem(SKIN_KEY);
    return SKIN_TONES.some((t) => t.id === v) ? (v as SkinToneId) : "brown";
  } catch {
    return "brown";
  }
}

function Preview({ config, view, hideJacket, fit, title, lastGroup = null }: { config: SuitConfig; view: StageView; hideJacket: boolean; skin: SkinToneId; fit: "contain" | "width"; title: string; lastGroup?: string | null }) {
  const cls = fit === "width" ? "w-full" : "h-full w-full p-[3%]";
  const drawing = (v: PreviewView) => <SuitDrawing config={config} view={v} hideJacket={hideJacket} className={fit === "width" ? "block h-auto w-full" : "h-full w-full"} title={title} />;
  if (hideJacket && (view === "back" || view === "modelBack")) {
    const back = `wc-back-${config.options["waistcoat.back"] === "fabric" ? "fabric" : "lining"}`;
    return <PhotoPreview config={config} view="waistcoat" asset={back} fit={fit} className={cls} title={title} fallback={drawing("back")} />;
  }
  if (hideJacket) return <PhotoPreview config={config} view="nojacket" fit={fit} className={cls} title={title} fallback={drawing("front")} />;
  if (view === "front") {
    const want = detailPhotoFor(lastGroup, config);
    const close = want && !hasPhoto(want) ? (DETAIL_FALLBACK[want] ?? null) : want;
    if (close && hasPhoto(close)) return <PhotoPreview config={config} view="front" asset={close} fit={fit} className={fit === "width" ? cls : "h-full w-full p-[4%]"} title={title} fallback={drawing("front")} />;
    return <PhotoPreview config={config} view="front" crop={DETAIL_CROP} fit={fit} className={fit === "width" ? cls : "h-full w-full px-[14%] py-[4%]"} title={title} fallback={drawing("front")} />;
  }
  if (view === "waistcoat") {
    const wc = waistcoatPhotoFor(lastGroup, config);
    return <PhotoPreview config={config} view="waistcoat" asset={wc} fit={fit} className={cls} title={title} fallback={drawing("waistcoat")} />;
  }
  const o = config.options;
  const neck = (lastGroup === "accents.necktie" || lastGroup === "accents.bowtie") && (o[lastGroup] ?? "none") !== "none";
  if (isPhoto(view) && neck) {
    // neckwear needs the shirt showing: the three-piece or open-shirt photo
    const shirt = o["suit.pieces"] === "three" ? "front-3pc-notch" : "front-shirt-notch";
    return <PhotoPreview config={config} view="front" asset={shirt} fit={fit} className={cls} title={title} fallback={drawing("front")} />;
  }
  const pv = isPhoto(view) ? "front" : view === "modelBack" ? "back" : (view as "back" | "lining");
  return <PhotoPreview config={config} view={pv} fit={fit} className={cls} title={title} fallback={drawing(pv)} />;
}

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
  lastGroup = null,
}: {
  config: SuitConfig;
  view: StageView;
  onViewChange: (v: StageView) => void;
  caption?: string;
  /** Last option group changed: picks the Detail close-up and the waistcoat photo. */
  lastGroup?: string | null;
}) {
  const three = config.options["suit.pieces"] === "three";
  const [hideJacket, setHideJacket] = useState(false);
  // Without the jacket: front, plus the waistcoat's back on a three-piece (there is no shirt-back photo).
  const views: StageView[] = hideJacket
    ? three
      ? ["model", "back"]
      : ["model"]
    : three
      ? ["model", "back", "lining", "waistcoat", "front"]
      : ["model", "back", "lining", "front"];
  const current = views.includes(view) ? view : "model";
  const [zoomOpen, setZoomOpen] = useState(false);
  const [skin, setSkinState] = useState<SkinToneId>("brown");
  useEffect(() => setSkinState(readSkin()), []);
  const setSkin = useCallback((t: SkinToneId) => {
    setSkinState(t);
    try {
      window.localStorage.setItem(SKIN_KEY, t);
    } catch {
      // per-viewer convenience only
    }
  }, []);

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
          <Preview config={config} view={current} hideJacket={hideJacket} skin={skin} fit="contain" title={label} lastGroup={lastGroup} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1 sm:px-4">
        <button type="button" onClick={() => step(-1)} className="flex h-9 w-9 flex-none items-center justify-center border border-line bg-paper text-lg text-ink hover:border-ink" aria-label="Previous view">
          ‹
        </button>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] sm:justify-center" role="tablist" aria-label="Preview view">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === current}
              onClick={() => onViewChange(v)}
              className={`flex-none whitespace-nowrap border px-1.5 py-1 text-[10px] uppercase tracking-normal transition-colors sm:px-2.5 sm:text-[11px] sm:tracking-wide ${v === current ? "border-ink bg-ink text-cream" : "border-line bg-paper text-muted hover:text-ink"}`}
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
          skin={skin}
          onSkin={setSkin}
          onClose={() => setZoomOpen(false)}
          lastGroup={lastGroup}
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
  skin,
  onClose,
  lastGroup = null,
}: {
  lastGroup?: string | null;
  config: SuitConfig;
  views: StageView[];
  view: StageView;
  onViewChange: (v: StageView) => void;
  hideJacket: boolean;
  onHideJacket: (h: boolean) => void;
  skin: SkinToneId;
  onSkin: (s: SkinToneId) => void;
  onClose: () => void;
}) {
  const widths = isPhoto(view) ? MODEL_ZOOM_WIDTHS : ZOOM_WIDTHS;
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
      if (e.key === "+" || e.key === "=") setLevel((l) => Math.min(2, l + 1));
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
    <div className={`fixed inset-0 z-[70] bg-[#eeeeee]`} role="dialog" aria-modal="true" aria-label="Close-up of your suit">
      <div ref={scroller} onScroll={measure} className="h-full w-full overflow-auto overscroll-contain">
        <div className="mx-auto" style={{ width: widths[level] }}>
          <Preview config={config} view={view} hideJacket={hideJacket} skin={skin} fit="width" lastGroup={lastGroup} title={`Close-up, ${VIEW_LABELS[view].toLowerCase()} view${hideJacket ? " without the jacket" : ""}`} />
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
        <button type="button" onClick={() => setLevel((l) => Math.min(2, l + 1))} disabled={level === widths.length - 1} aria-label="Zoom in" className={`${off} w-9 text-base disabled:opacity-40`}>
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
