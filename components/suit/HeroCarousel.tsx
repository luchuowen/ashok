"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroSlide = { src: string; alt: string; caption: string; /** CSS object-position used when the frame is wider than the photo */ focus?: string };

/**
 * Cross-fading hero carousel. Auto-advances every 6s, pauses on hover/focus and
 * when the tab is hidden, respects prefers-reduced-motion, and supports swipe,
 * arrow keys and dot navigation. Slides are 4:5 portraits with the model centred,
 * so object-cover keeps head and suit in frame at every breakpoint.
 */
export function HeroCarousel({ slides, interval = 6000 }: { slides: HeroSlide[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || reduced || n < 2) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === "visible") go(i + 1);
    }, interval);
    return () => window.clearTimeout(t);
  }, [i, paused, reduced, n, interval, go]);

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Suits made by the house"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(i + 1);
        if (e.key === "ArrowLeft") go(i - 1);
      }}
      onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touch.current) - touch.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-line bg-[#e9e1d3]">
        {slides.map((s, k) => (
          <div
            key={s.src}
            className={`absolute inset-0 transition-opacity ease-out ${reduced ? "duration-0" : "duration-[1200ms]"} ${k === i ? "opacity-100" : "opacity-0"}`}
            aria-hidden={k !== i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${k + 1} of ${n}`}
          >
            <Image
            quality={85}
              src={s.src}
              alt={s.alt}
              fill
              priority={k === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`object-cover transition-transform ease-out ${reduced ? "" : "duration-[7000ms]"} ${k === i && !reduced ? "scale-[1.03]" : "scale-100"}`}
              style={{ objectPosition: s.focus ?? "50% 30%" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="min-h-[1.25rem] text-xs text-muted" aria-live="polite">
          {slides[i]?.caption}
        </p>
        <div className="flex items-center gap-2">
          {slides.map((s, k) => (
            <button
              key={s.src}
              type="button"
              onClick={() => go(k)}
              aria-label={`Show slide ${k + 1}`}
              aria-current={k === i}
              className="group flex h-6 items-center"
            >
              <span className={`block h-px transition-all duration-500 ${k === i ? "w-8 bg-ink" : "w-4 bg-ink/30 group-hover:bg-ink/60"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
