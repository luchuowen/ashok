"use client";

import { useId } from "react";
import Image from "next/image";
import type { SuitFabric } from "@/lib/suit/types";
import { FabricPattern } from "./patterns";

/**
 * Swatch tile: real photography where the atelier has it, otherwise the same
 * procedural cloth the preview renders (so the swatch and the suit match).
 */
export function FabricSwatch({ fabric, className = "", large = false, priority = false }: { fabric: SuitFabric; className?: string; large?: boolean; priority?: boolean }) {
  const pid = `sw${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (fabric.image) {
    // next/image serves a right-sized, compressed copy (the originals are ~1600 px / ~450 KB each).
    return (
      <span className="relative block h-full w-full">
        <Image
          src={fabric.image}
          alt={`${fabric.name} swatch`}
          fill
          quality={80}
          priority={priority}
          sizes={large ? "(min-width: 1024px) 480px, 90vw" : "(min-width: 1024px) 160px, 34vw"}
          className={`object-cover ${className}`}
        />
      </span>
    );
  }
  return (
    <svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${className}`} role="img" aria-label={`${fabric.name} swatch`}>
      <defs>
        <FabricPattern id={pid} fabric={fabric} scale={large ? 2.2 : 1.6} />
        <linearGradient id={`${pid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect width="100" height="80" fill={`url(#${pid})`} />
      <rect width="100" height="80" fill={`url(#${pid}g)`} />
    </svg>
  );
}
