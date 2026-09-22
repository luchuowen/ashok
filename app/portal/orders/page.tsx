"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { LedgerTable } from "@/components/portal/LedgerTable";
import { Tag } from "@/components/ui/Tag";
import { usePortalData } from "@/app/portal/portal-context";
import type { Order, OrderStage } from "@/lib/db";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

const RETURNABLE_STAGES: OrderStage[] = ["Paid", "Ready for Collection", "Collected"];

export default function OrdersPage() {
  const { orders, refresh } = usePortalData();

  return (
    <Section>
      <h2 className="text-2xl">Orders</h2>
      <div className="mt-8">
        <LedgerTable<Order>
          columns={[
            { key: "item", header: "Order" },
            {
              key: "stage",
              header: "Stage",
              render: (row) => <Tag variant="stage">{row.statusNote}</Tag>,
            },
            { key: "startedAt", header: "Placed" },
            {
              key: "price",
              header: "Total",
              render: (row) => `${row.currency} ${row.price.toLocaleString("en-KE")}`,
            },
            {
              key: "id",
              header: "",
              render: (row) => <RequestReturnAction order={row} onRequested={refresh} />,
            },
          ]}
          rows={orders}
          emptyMessage="No orders yet — place a booking to start your first one."
        />
      </div>
    </Section>
  );
}

function RequestReturnAction({ order, onRequested }: { order: Order; onRequested: () => void }) {
  const [open, setOpen] = useState(false);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const eligible = order.source === "shop" && Boolean(order.items?.length) && RETURNABLE_STAGES.includes(order.stage);
  if (!eligible) return null;
  if (done) return <span className="text-xs text-muted">Return requested</span>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order.items) return;
    setSaving(true);
    setError(null);
    try {
      const lines = order.items!
        .map((item) => {
          const key = `${item.productId}::${item.variantId}`;
          return { productId: item.productId, variantId: item.variantId, qty: Number(qtys[key] ?? "0") };
        })
        .filter((l) => l.qty > 0);
      if (lines.length === 0) {
        setError("Enter a quantity for at least one item.");
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/portal/orders/${order.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not submit that return request.");
        return;
      }
      setDone(true);
      setOpen(false);
      onRequested();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs uppercase tracking-wide text-muted hover:text-oxblood"
      >
        Request Return
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-[220px] flex-col gap-2 border border-line p-3">
      {order.items!.map((item) => {
        const key = `${item.productId}::${item.variantId}`;
        return (
          <div key={key} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 flex-1">
              {item.productName} ({item.variantLabel})
            </span>
            <input
              type="number"
              min={0}
              max={item.qty}
              value={qtys[key] ?? ""}
              onChange={(e) => setQtys((q) => ({ ...q, [key]: e.target.value }))}
              className={`${inputClasses} w-16 text-xs`}
            />
          </div>
        );
      })}
      <input
        required
        placeholder="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={`${inputClasses} text-xs`}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Sending…" : "Submit"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
      {error ? <p className="text-xs text-oxblood">{error}</p> : null}
    </form>
  );
}
