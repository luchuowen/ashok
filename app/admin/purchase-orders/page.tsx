"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import type { Product, PurchaseOrder, Supplier } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

interface LineRow {
  productId: string;
  variantId: string;
  qtyOrdered: string;
  unitCost: string;
}

function emptyLine(products: Product[]): LineRow {
  const product = products[0];
  return {
    productId: product?.id ?? "",
    variantId: product?.variants[0]?.id ?? "",
    qtyOrdered: "1",
    unitCost: "",
  };
}

function lineTotal(po: PurchaseOrder): number {
  return po.lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitCost, 0);
}

export default function AdminPurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [poRes, supRes, prodRes] = await Promise.all([
        fetch("/api/admin/purchase-orders"),
        fetch("/api/admin/suppliers"),
        fetch("/api/admin/products"),
      ]);
      const poData = await poRes.json();
      if (!poRes.ok || !poData.ok) {
        setError(poData.error || "Could not load purchase orders.");
        return;
      }
      setError(null);
      setPurchaseOrders(poData.purchaseOrders);
      const supData = await supRes.json();
      if (supRes.ok && supData.ok) setSuppliers(supData.suppliers);
      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.ok) setProducts(prodData.products);
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
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Purchasing</p>
          <h2 className="text-2xl">Purchase Orders</h2>
        </div>
        {suppliers.length > 0 && products.length > 0 ? (
          <Button variant="ghost" onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "New Purchase Order"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}
      {purchaseOrders && suppliers.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Add a supplier first, then come back to raise an order.</p>
      ) : null}

      {creating ? (
        <div className="mt-6">
          <CreatePOForm
            suppliers={suppliers}
            products={products}
            onSaved={(id) => router.push(`/admin/purchase-orders/${id}`)}
          />
        </div>
      ) : null}

      {purchaseOrders === null && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : purchaseOrders && purchaseOrders.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Lines</th>
                <th className="py-2 pr-4">Total Cost</th>
                <th className="py-2 pr-4">Ordered</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="border-b border-line align-top">
                  <td className="py-2 pr-4">{po.supplierName}</td>
                  <td className="py-2 pr-4">
                    <Tag variant={po.status === "Received" ? "default" : "stage"}>{po.status}</Tag>
                  </td>
                  <td className="py-2 pr-4">{po.lines.length}</td>
                  <td className="py-2 pr-4">KES {lineTotal(po).toLocaleString("en-KE")}</td>
                  <td className="py-2 pr-4 text-muted">
                    {po.orderedAt ? new Date(po.orderedAt).toLocaleDateString("en-KE") : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/purchase-orders/${po.id}`}
                      className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No purchase orders yet.</p>
      )}
    </Section>
  );
}

function CreatePOForm({
  suppliers,
  products,
  onSaved,
}: {
  suppliers: Supplier[];
  products: Product[];
  onSaved: (id: string) => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([emptyLine(products)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(index: number, patch: Partial<LineRow>) {
    setLines((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addLine() {
    setLines((rows) => [...rows, emptyLine(products)]);
  }

  function removeLine(index: number) {
    setLines((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  function variantsFor(productId: string) {
    return products.find((p) => p.id === productId)?.variants ?? [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          notes,
          lines: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            qtyOrdered: Number(l.qtyOrdered),
            unitCost: Number(l.unitCost || 0),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not create that purchase order.");
        return;
      }
      onSaved(data.id);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-line p-4 sm:p-6">
      <p className="text-xs uppercase tracking-wide text-muted">New Purchase Order</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Supplier" htmlFor="po-supplier">
          <select
            id="po-supplier"
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputClasses}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Notes (optional)" htmlFor="po-notes">
          <input id="po-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClasses} />
        </FormField>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-muted">Lines</p>
        <div className="mt-3 flex flex-col gap-3">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-line p-3 sm:grid-cols-5">
              <select
                value={line.productId}
                onChange={(e) => {
                  const productId = e.target.value;
                  const firstVariant = variantsFor(productId)[0]?.id ?? "";
                  updateLine(i, { productId, variantId: firstVariant });
                }}
                className={`${inputClasses} text-xs`}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={line.variantId}
                onChange={(e) => updateLine(i, { variantId: e.target.value })}
                className={`${inputClasses} text-xs`}
              >
                {variantsFor(line.productId).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                placeholder="Qty ordered"
                value={line.qtyOrdered}
                onChange={(e) => updateLine(i, { qtyOrdered: e.target.value })}
                className={`${inputClasses} text-xs`}
              />
              <input
                type="number"
                min={0}
                placeholder="Unit cost (KES)"
                value={line.unitCost}
                onChange={(e) => updateLine(i, { unitCost: e.target.value })}
                className={`${inputClasses} text-xs`}
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={lines.length === 1}
                className="text-xs text-muted hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
        >
          Add Line
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create Purchase Order"}
        </Button>
        {error ? <p className="text-xs text-oxblood">{error}</p> : null}
      </div>
    </form>
  );
}
