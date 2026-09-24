import type { SpecGroup } from "@/lib/suit/types";

/** Read-only specification table — review step, bag, order history, work ticket. */
export function SpecList({
  groups,
  onEdit,
  compact = false,
}: {
  groups: SpecGroup[];
  /** When given, each group shows an "Edit" link that calls back with the group title. */
  onEdit?: (title: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {groups.map((g) => (
        <section key={g.title} className="break-inside-avoid">
          <div className="flex items-baseline justify-between border-b border-line pb-1">
            <h4 className={`font-body font-semibold uppercase tracking-[0.15em] text-oxblood ${compact ? "text-[10px]" : "text-[11px]"}`}>{g.title}</h4>
            {onEdit ? (
              <button type="button" onClick={() => onEdit(g.title)} className="text-[11px] uppercase tracking-wide text-muted underline-offset-2 hover:text-oxblood hover:underline">
                Edit
              </button>
            ) : null}
          </div>
          <dl className={`mt-1.5 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 ${compact ? "gap-y-0.5 text-xs" : "gap-y-1 text-sm"}`}>
            {g.rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="text-muted">{r.label}</dt>
                <dd className="text-ink">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
