export function FormGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-1 gap-6 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {children}
    </div>
  );
}
