export function PriceChip({
  price,
  currency = "KES",
  label = "From",
}: {
  price: number;
  currency?: string;
  label?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-tag border border-line bg-cream px-3 py-1 text-xs uppercase tracking-wide text-muted">
      <span>{label}</span>
      <span className="font-semibold text-ink">
        {currency} {price.toLocaleString("en-KE")}
      </span>
    </span>
  );
}
