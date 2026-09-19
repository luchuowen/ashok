export interface LedgerColumn<T> {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export function LedgerTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = "Nothing on file yet.",
}: {
  columns: LedgerColumn<T>[];
  rows: T[];
  /** Shown in place of the body when rows is empty, instead of a table with
   * headers over nothing — avoids implying data exists when it doesn't. */
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto border border-line bg-paper">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-xs uppercase tracking-wide text-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-sm text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-b-0">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3">
                    {col.render ? col.render(row) : String(row[col.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
