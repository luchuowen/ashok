"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";

interface ReportData {
  windowNote: string;
  sales: {
    shopOrderCount: number;
    paidShopOrderCount: number;
    shopRevenue: number;
    ordersByStage: Record<string, number>;
  };
  reconciliation: {
    unreconciledOrders: { id: string; clientName: string; item: string; price: number; stage: string }[];
    orphanedPayments: { id: string; orderId: string; clientName: string; amount: number; date: string }[];
  };
  inventory: {
    stockUnits: number;
    stockRetailValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  stockMovements: Record<string, { count: number; netQty: number }>;
  purchasing: {
    openPurchaseOrders: number;
    poCommittedCost: number;
    poReceivedCost: number;
  };
  returns: {
    returnsByStatus: Record<string, number>;
    totalRefunded: number;
  };
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load the report.");
        return;
      }
      setError(null);
      setReport(data);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Section border={false}>
        <p className="text-sm text-oxblood">{error}</p>
      </Section>
    );
  }
  if (!report) {
    return (
      <Section border={false}>
        <p className="text-sm text-muted">Loading…</p>
      </Section>
    );
  }

  const hasReconciliationGaps =
    report.reconciliation.unreconciledOrders.length > 0 || report.reconciliation.orphanedPayments.length > 0;

  return (
    <Section border={false}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Finance</p>
      <h2 className="text-2xl">Reports &amp; Reconciliation</h2>
      <p className="mt-2 text-xs text-muted">{report.windowNote}</p>

      <p className="mt-8 text-xs uppercase tracking-wide text-muted">Sales</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Shop Revenue (Paid+)" value={`KES ${report.sales.shopRevenue.toLocaleString("en-KE")}`} />
        <StatCard label="Paid Shop Orders" value={String(report.sales.paidShopOrderCount)} />
        <StatCard label="All Shop Orders" value={String(report.sales.shopOrderCount)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        {Object.entries(report.sales.ordersByStage).map(([stage, count]) => (
          <span key={stage} className="border border-line px-2 py-1">
            {stage}: {count}
          </span>
        ))}
      </div>

      <p className="mt-8 text-xs uppercase tracking-wide text-muted">Payment Reconciliation</p>
      {hasReconciliationGaps ? (
        <div className="mt-3 flex flex-col gap-4">
          {report.reconciliation.unreconciledOrders.length > 0 ? (
            <div>
              <p className="text-sm text-oxblood">
                {report.reconciliation.unreconciledOrders.length} paid-or-later shop order(s) with no matching
                Payment record:
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
                {report.reconciliation.unreconciledOrders.map((o) => (
                  <li key={o.id}>
                    {o.clientName} — {o.item} — KES {o.price.toLocaleString("en-KE")} ({o.stage}) — order {o.id}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.reconciliation.orphanedPayments.length > 0 ? (
            <div>
              <p className="text-sm text-oxblood">
                {report.reconciliation.orphanedPayments.length} payment(s) referencing an order that no longer
                exists:
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
                {report.reconciliation.orphanedPayments.map((p) => (
                  <li key={p.id}>
                    {p.clientName} — KES {p.amount.toLocaleString("en-KE")} on {p.date} — order {p.orderId}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Every paid-or-later shop order in this window has a matching payment record. No gaps found.
        </p>
      )}

      <p className="mt-8 text-xs uppercase tracking-wide text-muted">Inventory</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Units on Hand" value={report.inventory.stockUnits.toLocaleString("en-KE")} />
        <StatCard
          label="Retail Value on Hand"
          value={`KES ${report.inventory.stockRetailValue.toLocaleString("en-KE")}`}
        />
        <StatCard label="Low Stock" value={String(report.inventory.lowStockCount)} />
        <StatCard label="Out of Stock" value={String(report.inventory.outOfStockCount)} />
      </div>

      <p className="mt-8 text-xs uppercase tracking-wide text-muted">Stock Movements</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        {Object.entries(report.stockMovements).length > 0 ? (
          Object.entries(report.stockMovements).map(([type, t]) => (
            <span key={type} className="border border-line px-2 py-1">
              {type}: {t.count} ({t.netQty > 0 ? `+${t.netQty}` : t.netQty})
            </span>
          ))
        ) : (
          <span>No stock movements yet.</span>
        )}
      </div>

      <p className="mt-8 text-xs uppercase tracking-wide text-muted">Purchasing</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open Purchase Orders" value={String(report.purchasing.openPurchaseOrders)} />
        <StatCard label="Committed Cost" value={`KES ${report.purchasing.poCommittedCost.toLocaleString("en-KE")}`} />
        <StatCard label="Received Cost" value={`KES ${report.purchasing.poReceivedCost.toLocaleString("en-KE")}`} />
      </div>

      <p className="mt-8 text-xs uppercase tracking-wide text-muted">Returns &amp; Refunds</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          {Object.entries(report.returns.returnsByStatus).length > 0 ? (
            Object.entries(report.returns.returnsByStatus).map(([status, count]) => (
              <span key={status} className="border border-line px-2 py-1">
                {status}: {count}
              </span>
            ))
          ) : (
            <span>No returns yet.</span>
          )}
        </div>
        <span className="text-sm">Total Refunded: KES {report.returns.totalRefunded.toLocaleString("en-KE")}</span>
      </div>
    </Section>
  );
}
