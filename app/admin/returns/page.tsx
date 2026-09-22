"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import type { ReturnRequest } from "@/lib/inventory";
import type { Order } from "@/lib/db";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

const REFUND_METHODS = ["M-Pesa", "Card", "Bank Transfer", "Cash", "Store Credit"] as const;

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/returns");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load returns.");
        return;
      }
      setError(null);
      setReturns(data.returns);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Section border={false}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Aftersales</p>
          <h2 className="text-2xl">Returns</h2>
        </div>
        <Button variant="ghost" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancel" : "New Return"}
        </Button>
      </div>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}

      {creating ? (
        <div className="mt-6">
          <CreateReturnForm
            onSaved={() => {
              setCreating(false);
              load();
            }}
          />
        </div>
      ) : null}

      {returns === null && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : returns && returns.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {returns.map((r) => (
            <ReturnCard key={r.id} ret={r} onChanged={load} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No returns yet.</p>
      )}
    </Section>
  );
}

function ReturnCard({ ret, onChanged }: { ret: ReturnRequest; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState(String(ret.refundAmount ?? ""));
  const [refundMethod, setRefundMethod] = useState<(typeof REFUND_METHODS)[number]>(
    ret.refundMethod ?? "M-Pesa",
  );

  async function act(action: "approve" | "reject" | "refund", extra?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/returns/${ret.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not update that return.");
        return;
      }
      onChanged();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{ret.clientName}</p>
          <p className="text-xs text-muted">
            Order {ret.orderId} — requested {new Date(ret.requestedAt).toLocaleString("en-KE")}
          </p>
        </div>
        <Tag variant={ret.status === "Requested" ? "stage" : "default"}>{ret.status}</Tag>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {ret.lines.map((l) => (
          <li key={`${l.productId}-${l.variantId}`}>
            {l.qty}x {l.productName} — {l.variantLabel}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Reason: {ret.reason}</p>
      {ret.notes ? <p className="text-xs text-muted">Notes: {ret.notes}</p> : null}
      {ret.status === "Refunded" ? (
        <p className="mt-2 text-xs text-muted">
          Refunded {ret.refundAmount ? `KES ${ret.refundAmount.toLocaleString("en-KE")}` : ""} via {ret.refundMethod}
        </p>
      ) : null}

      {ret.status === "Requested" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => act("approve")}
            disabled={busy}
            className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
          >
            Approve &amp; Restock
          </button>
          <button
            type="button"
            onClick={() => act("reject")}
            disabled={busy}
            className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
          >
            Reject
          </button>
        </div>
      ) : null}

      {ret.status === "Approved" ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <FormField label="Refund Amount (KES)" htmlFor={`refund-amt-${ret.id}`}>
            <input
              id={`refund-amt-${ret.id}`}
              type="number"
              min={0}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className={`${inputClasses} w-32 text-xs`}
            />
          </FormField>
          <FormField label="Method" htmlFor={`refund-method-${ret.id}`}>
            <select
              id={`refund-method-${ret.id}`}
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as (typeof REFUND_METHODS)[number])}
              className={`${inputClasses} text-xs`}
            >
              {REFUND_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </FormField>
          <button
            type="button"
            onClick={() => act("refund", { refundAmount: Number(refundAmount), refundMethod })}
            disabled={busy}
            className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
          >
            Mark Refunded
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-oxblood">{error}</p> : null}
    </div>
  );
}

function CreateReturnForm({ onSaved }: { onSaved: () => void }) {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLooking(true);
    setLookupError(null);
    setOrder(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId.trim()}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLookupError(data.error || "Order not found.");
        return;
      }
      if (data.order.source !== "shop" || !data.order.items?.length) {
        setLookupError("This order has no shop items to return.");
        return;
      }
      setOrder(data.order);
    } catch {
      setLookupError("Could not reach the server.");
    } finally {
      setLooking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !order.items) return;
    setSaving(true);
    setError(null);
    try {
      const lines = order.items
        .map((item) => {
          const key = `${item.productId}::${item.variantId}`;
          const qty = Number(qtys[key] ?? "0");
          return { productId: item.productId, variantId: item.variantId, qty };
        })
        .filter((l) => l.qty > 0);
      if (lines.length === 0) {
        setError("Enter a quantity for at least one item.");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/admin/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, lines, reason, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not create that return.");
        return;
      }
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-line p-4 sm:p-6">
      <p className="text-xs uppercase tracking-wide text-muted">Look Up an Order</p>
      <form onSubmit={handleLookup} className="mt-3 flex flex-wrap items-end gap-3">
        <FormField label="Order ID" htmlFor="ret-order-id">
          <input
            id="ret-order-id"
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Paste the order ID"
            className={inputClasses}
          />
        </FormField>
        <Button type="submit" disabled={looking}>
          {looking ? "Looking up…" : "Find Order"}
        </Button>
      </form>
      {lookupError ? <p className="mt-2 text-xs text-oxblood">{lookupError}</p> : null}
      <p className="mt-2 text-xs text-muted">
        Find the order ID from the customer&apos;s record via Find a Customer on the Customers tab.
      </p>

      {order && order.items ? (
        <form onSubmit={handleSubmit} className="mt-6 border-t border-line pt-4">
          <p className="text-sm">
            {order.clientName} — {order.item}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {order.items.map((item) => {
              const key = `${item.productId}::${item.variantId}`;
              return (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm">
                    {item.productName} — {item.variantLabel} (bought {item.qty})
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={item.qty}
                    placeholder="Qty to return"
                    value={qtys[key] ?? ""}
                    onChange={(e) => setQtys((q) => ({ ...q, [key]: e.target.value }))}
                    className={`${inputClasses} w-32 text-xs`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <FormField label="Reason" htmlFor="ret-reason">
              <input
                id="ret-reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Wrong size"
                className={inputClasses}
              />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Notes (optional)" htmlFor="ret-notes">
              <input id="ret-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClasses} />
            </FormField>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Return"}
            </Button>
            {error ? <p className="text-xs text-oxblood">{error}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
