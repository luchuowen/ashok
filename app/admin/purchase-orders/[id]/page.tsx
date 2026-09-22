"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import type { PurchaseOrder } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load that purchase order.");
        return;
      }
      setError(null);
      setPo(data.purchaseOrder);
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

  async function handleReceive() {
    if (!po) return;
    setActionError(null);
    const payload = po.lines
      .map((line) => {
        const key = lineKey(line.productId, line.variantId);
        const qty = Number(receipts[key] ?? "");
        return { productId: line.productId, variantId: line.variantId, qty };
      })
      .filter((r) => Number.isFinite(r.qty) && r.qty > 0);
    if (payload.length === 0) {
      setActionError("Enter at least one received quantity.");
      return;
    }
    setReceiving(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipts: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionError(data.error || "Could not record that receipt.");
        return;
      }
      setReceipts({});
      await load();
    } catch {
      setActionError("Could not reach the server.");
    } finally {
      setReceiving(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this purchase order?")) return;
    setCancelling(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionError(data.error || "Could not cancel that purchase order.");
        return;
      }
      await load();
    } catch {
      setActionError("Could not reach the server.");
    } finally {
      setCancelling(false);
    }
  }

  if (error) {
    return (
      <Section border={false}>
        <p className="text-sm text-oxblood">{error}</p>
      </Section>
    );
  }
  if (!po) {
    return (
      <Section border={false}>
        <p className="text-sm text-muted">Loading…</p>
      </Section>
    );
  }

  const canReceive = po.status === "Ordered" || po.status === "Partially Received";
  const canCancel = po.status !== "Received" && po.status !== "Cancelled";

  return (
    <Section border={false}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Purchase Order</p>
          <h2 className="text-2xl">{po.supplierName}</h2>
          {po.notes ? <p className="mt-1 text-sm text-muted">{po.notes}</p> : null}
        </div>
        <Tag variant={po.status === "Received" ? "default" : "stage"}>{po.status}</Tag>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Variant</th>
              <th className="py-2 pr-4">Ordered</th>
              <th className="py-2 pr-4">Received</th>
              <th className="py-2 pr-4">Unit Cost</th>
              {canReceive ? <th className="py-2 pr-4">Receive Now</th> : null}
            </tr>
          </thead>
          <tbody>
            {po.lines.map((line) => {
              const key = lineKey(line.productId, line.variantId);
              const remaining = line.qtyOrdered - line.qtyReceived;
              return (
                <tr key={key} className="border-b border-line align-top">
                  <td className="py-2 pr-4">{line.productName}</td>
                  <td className="py-2 pr-4 text-muted">{line.variantLabel}</td>
                  <td className="py-2 pr-4">{line.qtyOrdered}</td>
                  <td className="py-2 pr-4">{line.qtyReceived}</td>
                  <td className="py-2 pr-4">KES {line.unitCost.toLocaleString("en-KE")}</td>
                  {canReceive ? (
                    <td className="py-2 pr-4">
                      {remaining > 0 ? (
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          placeholder={`up to ${remaining}`}
                          value={receipts[key] ?? ""}
                          onChange={(e) => setReceipts((r) => ({ ...r, [key]: e.target.value }))}
                          className={`${inputClasses} w-28 text-xs`}
                        />
                      ) : (
                        <span className="text-xs text-muted">Fully received</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {canReceive ? (
          <Button onClick={handleReceive} disabled={receiving}>
            {receiving ? "Recording…" : "Record Receipt"}
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="ghost" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Cancel Order"}
          </Button>
        ) : null}
        {actionError ? <p className="text-xs text-oxblood">{actionError}</p> : null}
      </div>
      {po.receivedAt ? (
        <p className="mt-4 text-xs text-muted">Fully received {new Date(po.receivedAt).toLocaleString("en-KE")}.</p>
      ) : null}
    </Section>
  );
}
