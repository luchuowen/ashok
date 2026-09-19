export function Tag({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "stage";
}) {
  const styles =
    variant === "stage"
      ? "border-oxblood text-oxblood"
      : "border-line text-muted";

  return (
    <span
      className={`inline-block rounded-tag border px-2 py-0.5 text-[11px] uppercase tracking-wide ${styles}`}
    >
      {children}
    </span>
  );
}
