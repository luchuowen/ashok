"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Tag } from "@/components/ui/Tag";
import type { Category, Product, ProductVariant, StockMovement } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

type Filter = "all" | "low" | "out";

interface VariantRow {
  product: Product;
  variant: ProductVariant;
}

function statusOf(v: ProductVariant): "out" | "low" | "ok" {
  if (v.stockQty <= 0) return "out";
  if (v.stockQty <= v.lowStockThreshold) return "low";
  return "ok";
}

export default function AdminStockPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const [prodRes, catRes, movRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
        fetch("/api/admin/stock/movements?limit=40"),
      ]);
      const prodData = await prodRes.json();
      if (!prodRes.ok || !prodData.ok) {
        setError(prodData.error || "Could not load stock.");
        return;
      }
      setError(null);
      setProducts(prodData.products);
      const catData = await catRes.json();
      if (catRes.ok && catData.ok) setCategories(catData.categories);
      const movData = await movRes.json();
      if (movRes.ok && movData.ok) setMovements(movData.movements);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo<VariantRow[]>(() => {
    if (!products) return [];
    const all = products.flatMap((product) => product.variants.map((variant) => ({ product, variant })));
    if (filter === "all") return all;
    return all.filter(({ variant }) => statusOf(variant) === filter);
  }, [products, filter]);

  const lowCount = useMemo(
    () => (products ? products.flatMap((p) => p.variants).filter((v) => statusOf(v) === "low").length : 0),
    [products],
  );
  const outCount = useMemo(
    () => (products ? products.flatMap((p) => p.variants).filter((v) => statusOf(v) === "out").length : 0),
    [products],
  );

  return (
    <Section border={false}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Inventory</p>
      <h2 className="text-2xl">Stock Levels</h2>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["low", `Low Stock (${lowCount})`],
            ["out", `Out of Stock (${outCount})`],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`border px-3 py-1.5 text-xs uppercase tracking-wide ${
              filter === value ? "border-oxblood text-oxblood" : "border-line text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {products === null && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : rows.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Variant</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ product, variant }) => (
                <StockRow
                  key={`${product.id}-${variant.id}`}
                  product={product}
                  variant={variant}
                  categoryLabel={categoryName(product.categoryId)}
                  onAdjusted={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Nothing matches this filter.</p>
      )}

      <div className="mt-10">
        <p className="text-xs uppercase tracking-wide text-muted">Recent Stock Movements</p>
        {movements.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Change</th>
                  <th className="py-2 pr-4">Balance</th>
                  <th className="py-2 pr-4">Reason / Ref</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-line text-muted">
                    <td className="py-2 pr-4">{new Date(m.createdAt).toLocaleString("en-KE")}</td>
                    <td className="py-2 pr-4 text-ink">
                      {m.productName} — {m.variantLabel}
                    </td>
                    <td className="py-2 pr-4">{m.type}</td>
                    <td className={`py-2 pr-4 ${m.qtyChange < 0 ? "text-oxblood" : "text-ink"}`}>
                      {m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}
                    </td>
                    <td className="py-2 pr-4">{m.balanceAfter}</td>
                    <td className="py-2 pr-4">
                      {m.reason || m.relatedOrderId || m.relatedPurchaseOrderId || m.relatedReturnId || m.relatedStockTakeId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No stock movements yet.</p>
        )}
      </div>
    </Section>
  );
}

function StockRow({
  product,
  variant,
  categoryLabel,
  onAdjusted,
}: {
  product: Product;
  variant: ProductVariant;
  categoryLabel: string;
  onAdjusted: () => void;
}) {
  const [qtyChange, setQtyChange] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const status = statusOf(variant);

  async function handleApply() {
    setRowError(null);
    const change = Number(qtyChange);
    if (!Number.isFinite(change) || !Number.isInteger(change) || change === 0) {
      setRowError("Enter a non-zero whole number.");
      return;
    }
    if (!reason.trim()) {
      setRowError("Give a reason.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: variant.id,
          qtyChange: change,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRowError(data.error || "Could not apply that adjustment.");
        return;
      }
      setQtyChange("");
      setReason("");
      onAdjusted();
    } catch {
      setRowError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b border-line align-top">
      <td className="py-2 pr-4">{product.name}</td>
      <td className="py-2 pr-4 text-muted">{categoryLabel}</td>
      <td className="py-2 pr-4">{variant.label}</td>
      <td className="py-2 pr-4 text-muted">{variant.sku}</td>
      <td className="py-2 pr-4">{variant.stockQty}</td>
      <td className="py-2 pr-4">
        {status === "out" ? (
          <Tag variant="stage">Out of Stock</Tag>
        ) : status === "low" ? (
          <Tag variant="stage">Low Stock</Tag>
        ) : (
          <Tag>In Stock</Tag>
        )}
      </td>
      <td className="py-2 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            placeholder="±qty"
            value={qtyChange}
            onChange={(e) => setQtyChange(e.target.value)}
            className={`${inputClasses} w-20 text-xs`}
          />
          <input
            type="text"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${inputClasses} w-32 text-xs`}
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={saving}
            className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
          >
            {saving ? "Applying…" : "Apply"}
          </button>
        </div>
        {rowError ? <p className="mt-1 text-xs text-oxblood">{rowError}</p> : null}
      </td>
    </tr>
  );
}
