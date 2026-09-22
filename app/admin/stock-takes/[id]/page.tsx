"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import type { StockTake } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function StockTakeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [stockTake, setStockTake] = useState<StockTake | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stock-takes/${id}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load that stock take.");
        return;
      }
      setError(null);
      setStockTake(data.stockTake);
    } catch {
      setError("Could not reach the server.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function lineKey(productId: string, variantId: string) {
    return `${productId}::${variantId}`;
  }

  async function handleSaveCounts() {
    if (!stockTake) return;
    setActionError(null);
    const payload = Object.entries(counts)
      .filter(([, v]) => v.trim() !== "")
      .map(([key, v]) => {
        const [productId, variantId] = key.split("::");
        return { productId, variantId, countedQty: Number(v) };
      })
      .filter((c) => Number.isFinite(c.countedQty) && c.countedQty >= 0);
    if (payload.length === 0) {
      setActionError("Enter at least one count first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stock-takes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionError(data.error || "Could not save those counts.");
        return;
      }
      setCounts({});
      await load();
    } catch {
      setActionError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!stockTake) return;
    const uncounted = stockTake.lines.filter((l) => l.countedQty === null).length;
    const confirmMsg =
      uncounted > 0
        ? `${uncounted} line(s) have no count yet and will be left untouched. Complete anyway?`
        : "Complete this stock take? Counted variances will be posted as stock adjustments.";
    if (!window.confirm(confirmMsg)) return;
    setCompleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/stock-takes/${id}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionError(data.error || "Could not complete that stock take.");
        return;
      }
      await load();
    } catch {
      setActionError("Could not reach the server.");
    } finally {
      setCompleting(false);
    }
  }

  if (error) {
    return (
      <Section border={false}>
        <p className="text-sm text-oxblood">{error}</p>
      </Section>
    );
  }
  if (!stockTake) {
    return (
      <Section border={false}>
        <p className="text-sm text-muted">Loading…</p>
      </Section>
    );
  }

  const inProgress = stockTake.status === "In Progress";

  return (
    <Section border={false}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">
            Stock Take — {new Date(stockTake.startedAt).toLocaleString("en-KE")}
          </p>
          <h2 className="text-2xl">{stockTake.notes || "Untitled Stock Take"}</h2>
        </div>
        <Tag variant={inProgress ? "stage" : "default"}>{stockTake.status}</Tag>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Variant</th>
              <th className="py-2 pr-4">Expected</th>
              <th className="py-2 pr-4">Counted</th>
              <th className="py-2 pr-4">Variance</th>
            </tr>
          </thead>
          <tbody>
            {stockTake.lines.map((line) => {
              const key = lineKey(line.productId, line.variantId);
              return (
                <tr key={key} className="border-b border-line align-top">
                  <td className="py-2 pr-4">{line.productName}</td>
                  <td className="py-2 pr-4 text-muted">{line.variantLabel}</td>
                  <td className="py-2 pr-4">{line.expectedQty}</td>
                  <td className="py-2 pr-4">
                    {inProgress ? (
                      <input
                        type="number"
                        min={0}
                        placeholder={line.countedQty !== null ? String(line.countedQty) : "—"}
                        value={counts[key] ?? ""}
                        onChange={(e) => setCounts((c) => ({ ...c, [key]: e.target.value }))}
                        className={`${inputClasses} w-24 text-xs`}
                      />
                    ) : (
                      (line.countedQty ?? "—")
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {line.variance === null ? (
                      "—"
                    ) : (
                      <span className={line.variance !== 0 ? "text-oxblood" : ""}>
                        {line.variance > 0 ? `+${line.variance}` : line.variance}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inProgress ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={handleSaveCounts} disabled={saving}>
            {saving ? "Saving…" : "Save Counts"}
          </Button>
          <Button variant="ghost" onClick={handleComplete} disabled={completing}>
            {completing ? "Completing…" : "Complete Stock Take"}
          </Button>
          {actionError ? <p className="text-xs text-oxblood">{actionError}</p> : null}
        </div>
      ) : (
        <p className="mt-6 text-xs text-muted">
          Completed {stockTake.completedAt ? new Date(stockTake.completedAt).toLocaleString("en-KE") : ""} —
          non-zero variances were posted to the stock ledger as adjustments.
        </p>
      )}
    </Section>
  );
}
