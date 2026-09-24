"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Tag } from "@/components/ui/Tag";
import { SuitPreview } from "@/components/suit/SuitPreview";
import type { Order } from "@/lib/db";
import { METHOD_LABELS } from "@/lib/suit/measurements";
import { isPartiallyPaid } from "@/lib/order-stages";

const FILTERS = [
  { id: "active", label: "In production", test: (o: Order) => !["Payment Pending", "Cancelled", "Collected", "Returned", "Refunded"].includes(o.stage) },
  { id: "measure", label: "Needs measuring", test: (o: Order) => o.fitProfile?.method === "atelier" && o.stage === "Consultation" },
  { id: "balance", label: "Balance due", test: (o: Order) => o.balanceDue > 0 && o.stage !== "Payment Pending" && o.stage !== "Cancelled" },
  { id: "pending", label: "Awaiting payment", test: (o: Order) => o.stage === "Payment Pending" },
  { id: "done", label: "Collected", test: (o: Order) => o.stage === "Collected" },
  { id: "all", label: "All", test: () => true },
] as const;

export default function AdminCustomOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("active");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/custom-orders");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load custom orders.");
        return;
      }
      setError(null);
      setOrders(data.orders);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const needle = q.trim().toLowerCase();
    return (orders ?? []).filter(
      (o) => f.test(o) && (!needle || [o.clientName, o.clientId, o.id, o.item, o.reference ?? ""].join(" ").toLowerCase().includes(needle)),
    );
  }, [orders, filter, q]);

  return (
    <Section border={false}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Designed online</p>
          <h2 className="text-2xl">Custom Suit Orders</h2>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, reference…"
          className="w-64 border border-line bg-paper px-3 py-2 text-sm focus:border-oxblood focus:outline-none"
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`border px-3 py-1.5 text-xs uppercase tracking-wide ${filter === f.id ? "border-ink bg-ink text-cream" : "border-line text-muted hover:text-ink"}`}
          >
            {f.label}
            {orders ? ` · ${orders.filter(f.test).length}` : ""}
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}
      {orders === null && !error ? <p className="mt-6 text-sm text-muted">Loading…</p> : null}
      {orders && rows.length === 0 ? <p className="mt-6 text-sm text-muted">No orders in this view.</p> : null}
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {rows.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/custom-orders/${o.id}`} className="flex gap-4 py-4 hover:bg-cream">
              <div className="h-24 w-16 flex-none border border-line bg-cream">
                {o.suits?.[0] ? <SuitPreview config={o.suits[0].config} className="h-full w-full" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {o.clientName} <span className="text-muted">· {o.clientId}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {o.id.slice(-8).toUpperCase()} · placed {o.startedAt}
                    {o.estimatedCompletion ? ` · due ${o.estimatedCompletion}` : ""}
                  </p>
                </div>
                <p className="mt-1 truncate text-sm">{o.item}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Tag variant="stage">{o.stage}</Tag>
                  {o.fitProfile ? <Tag>{METHOD_LABELS[o.fitProfile.method]}</Tag> : null}
                  {o.delivery ? <Tag>{o.delivery.method === "collect" ? "Collect" : o.delivery.method === "nairobi" ? "Nairobi delivery" : o.delivery.method === "international" ? `International · ${o.delivery.country ?? ""}` : "Courier"}</Tag> : null}
                  {isPartiallyPaid(o) ? <Tag variant="stage">Balance KES {o.balanceDue.toLocaleString("en-KE")}</Tag> : null}
                  <span className="text-xs text-muted">KES {o.price.toLocaleString("en-KE")}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
