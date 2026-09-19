const GRADIENTS = [
  "linear-gradient(135deg, #8A4432 0%, #14120F 100%)",
  "linear-gradient(135deg, #5b5648 0%, #14120F 100%)",
  "linear-gradient(135deg, #ddd3c1 0%, #8A4432 100%)",
];

function hashLabel(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) % GRADIENTS.length;
  }
  return hash;
}

/**
 * Every image slot renders one of these until real photography is dropped in —
 * never a broken <img> or an unlabeled grey box.
 */
export function ImagePlaceholder({
  label,
  aspectRatio = "4 / 3",
  className = "",
}: {
  label: string;
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-end border border-line p-3 ${className}`}
      style={{ aspectRatio, background: GRADIENTS[hashLabel(label)] }}
    >
      <span className="bg-cream/90 px-2 py-1 text-[11px] uppercase tracking-wide text-ink">
        {label}
      </span>
    </div>
  );
}
