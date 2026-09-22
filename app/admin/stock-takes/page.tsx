"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import type { StockTake } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function AdminStockTakesPage() {
  const router = useRouter();
  const [stockTakes, setStockTakes] = useState<StockTake[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stock-takes");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load stock takes.");
        return;
      }
      setError(null);
      setStockTakes(data.stockTakes);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/admin/stock-takes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStartError(data.error || "Could not start a stock take.");
        return;
      }
      router.push(`/admin/stock-takes/${data.id}`);
    } catch {
      setStartError("Could not reach the server.");
    } finally {
      setStarting(false);
    }
  }

  const inProgress = stockTakes?.some((st) => st.status === "In Progress") ?? false;

  return (
    <Section border={false}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Inventory</p>
      <h2 className="text-2xl">Stock Takes</h2>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}

      {stockTakes === null && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : stockTakes && stockTakes.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Started</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Lines</th>
                <th className="py-2 pr-4">Notes</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {stockTakes.map((st) => (
                <tr key={st.id} className="border-b border-line align-top">
                  <td className="py-2 pr-4">{new Date(st.startedAt).toLocaleString("en-KE")}</td>
                  <td className="py-2 pr-4">
                    <Tag variant={st.status === "In Progress" ? "stage" : "default"}>{st.status}</Tag>
                  </td>
                  <td className="py-2 pr-4">{st.lines.length}</td>
                  <td className="py-2 pr-4 text-muted">{st.notes || "—"}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/stock-takes/${st.id}`}
                      className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
                    >
                      {st.status === "In Progress" ? "Count" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No stock takes yet.</p>
      )}

      <div className="mt-10 max-w-md">
        <form onSubmit={handleStart} className="border border-line p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Start a New Stock Take</p>
          {inProgress ? (
            <p className="mt-2 text-xs text-oxblood">
              A stock take is already in progress. Complete or leave it before starting another.
            </p>
          ) : null}
          <div className="mt-3">
            <FormField label="Notes (optional)" htmlFor="st-notes">
              <input
                id="st-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Quarterly count — shoes shelf"
                className={inputClasses}
              />
            </FormField>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button type="submit" disabled={starting}>
              {starting ? "Starting…" : "Start Stock Take"}
            </Button>
            {startError ? <p className="text-xs text-oxblood">{startError}</p> : null}
          </div>
          <p className="mt-2 text-xs text-muted">
            Snapshots every active product&apos;s current stock as the expected quantity to count
            against.
          </p>
        </form>
      </div>
    </Section>
  );
}
