const COLUMN_CLASSES = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function CardGrid({
  columns,
  children,
  className = "",
}: {
  columns: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-px border border-line bg-line ${COLUMN_CLASSES[columns]} ${className}`}
    >
      {children}
    </div>
  );
}
