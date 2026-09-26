import Image from "next/image";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

/**
 * Drop-in replacement for ImagePlaceholder once real photography exists for a
 * slot. Pass `src` from a fixture's optional `image` field; until it's set,
 * this renders the same labelled placeholder box everything else still uses,
 * so slots can be filled in one at a time without touching call sites twice.
 */
export function Photo({
  src,
  label,
  alt,
  aspectRatio = "4 / 3",
  className = "",
  sizes = "(min-width: 1024px) 45vw, (min-width: 768px) 60vw, 100vw",
  priority = false,
  bordered = true,
}: {
  src?: string;
  label: string;
  alt?: string;
  aspectRatio?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Set false for a full-bleed placement (e.g. a hero background) that shouldn't carry the hairline border every other photo slot has. */
  bordered?: boolean;
}) {
  if (!src) {
    return <ImagePlaceholder label={label} aspectRatio={aspectRatio} className={className} />;
  }

  const positionClass = className.includes("absolute") ? "" : "relative";

  return (
    <div
      className={`${positionClass} overflow-hidden ${bordered ? "border border-line" : ""} ${className}`}
      style={{ aspectRatio }}
    >
      <Image
            quality={85}
        src={src}
        alt={alt ?? label}
        fill
        sizes={sizes}
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
