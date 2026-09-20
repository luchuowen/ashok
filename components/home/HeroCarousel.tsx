"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type HeroSlide = {
  src: string;
  alt: string;
};

// Cinematic hero background: slow cross-fades between full-bleed photos with
// a continuous, subtle Ken Burns drift on each — not a standard slideshow
// with hard cuts or arrows. Hero copy (h1/p/buttons) sits in a separate
// layer above this and is never touched here.
const SLIDE_DURATION_MS = 6500;
const CROSSFADE_MS = 1600;

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, SLIDE_DURATION_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, slides.length]);

  const cycleDuration = SLIDE_DURATION_MS * slides.length;

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-ink">
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          aria-hidden={index !== active}
          className="absolute inset-0"
          style={{
            opacity: index === active ? 1 : 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            priority={index === 0}
            className={reduceMotion ? "object-cover" : "object-cover animate-hero-kenburns"}
            style={reduceMotion ? undefined : { animationDuration: `${cycleDuration}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
