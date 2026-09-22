"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import { effectivePrice, type Category, type Product } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

interface VariantRow {
  id?: string;
  label: string;
  sku: string;
  stockQty: string;
  lowStockThreshold: string;
  priceOverride: string;
}

function emptyVariantRow(): VariantRow {
  return { label: "", sku: "", stockQty: "0", lowStockThreshold: "0", priceOverride: "" };
}

function totalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.stockQty, 0);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
      ]);
      const prodData = await prodRes.json();
      if (!prodRes.ok || !prodData.ok) {
        setError(prodData.error || "Could not load products.");
        return;
      }
      setError(null);
      setProducts(prodData.products);
      const catData = await catRes.json();
      if (catRes.ok && catData.ok) setCategories(catData.categories);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <Section border={false}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Catalogue</p>
          <h2 className="text-2xl">Products</h2>
        </div>
        {categories.length > 0 ? (
          <Button
            variant="ghost"
            onClick={() => {
              setEditingId(null);
              setCreating((v) => !v);
            }}
          >
            {creating ? "Cancel" : "New Product"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}
      {products && categories.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Add a category first, then come back to add products.</p>
      ) : null}

      {creating ? (
        <div className="mt-6">
          <ProductForm
            categories={categories}
            onSaved={() => {
              setCreating(false);
              load();
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : null}

      {products === null && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : products && products.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Discount</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-b border-line align-top">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4 text-muted">{categoryName(p.categoryId)}</td>
                    <td className="py-2 pr-4">
                      {p.discountPercent ? (
                        <>
                          <span className="text-muted line-through">
                            {p.currency} {p.price.toLocaleString("en-KE")}
                          </span>{" "}
                          {p.currency} {effectivePrice(p).toLocaleString("en-KE")}
                        </>
                      ) : (
                        <>
                          {p.currency} {p.price.toLocaleString("en-KE")}
                        </>
                      )}
                    </td>
                    <td className="py-2 pr-4">{p.discountPercent ? `${p.discountPercent}%` : "—"}</td>
                    <td className="py-2 pr-4">
                      {totalStock(p)}
                      {p.variants.some((v) => v.stockQty <= v.lowStockThreshold) ? (
                        <span className="ml-1 text-xs text-oxblood">low</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4">
                      <Tag variant={p.active ? "default" : "stage"}>{p.active ? "Active" : "Hidden"}</Tag>
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCreating(false);
                          setEditingId(editingId === p.id ? null : p.id);
                        }}
                        className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
                      >
                        {editingId === p.id ? "Close" : "Edit"}
                      </button>
                    </td>
                  </tr>
                  {editingId === p.id ? (
                    <tr className="border-b border-line">
                      <td colSpan={7} className="py-4">
                        <ProductForm
                          categories={categories}
                          product={p}
                          onSaved={() => {
                            setEditingId(null);
                            load();
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : products ? (
        <p className="mt-6 text-sm text-muted">No products yet.</p>
      ) : null}
    </Section>
  );
}

function ProductForm({
  categories,
  product,
  onSaved,
  onCancel,
}: {
  categories: Category[];
  product?: Product;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [discountPercent, setDiscountPercent] = useState(
    product?.discountPercent ? String(product.discountPercent) : "",
  );
  const [imageLabel, setImageLabel] = useState(product?.imageLabel ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [variants, setVariants] = useState<VariantRow[]>(
    product && product.variants.length > 0
      ? product.variants.map((v) => ({
          id: v.id,
          label: v.label,
          sku: v.sku,
          stockQty: String(v.stockQty),
          lowStockThreshold: String(v.lowStockThreshold),
          priceOverride: v.priceOverride ? String(v.priceOverride) : "",
        }))
      : [emptyVariantRow()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addVariant() {
    setVariants((rows) => [...rows, emptyVariantRow()]);
  }

  function removeVariant(index: number) {
    setVariants((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name,
      categoryId,
      description,
      price: Number(price),
      discountPercent: discountPercent.trim() ? Number(discountPercent) : 0,
      imageLabel: imageLabel.trim() || name,
      active,
      variants: variants
        .filter((v) => v.label.trim())
        .map((v) => ({
          id: v.id,
          label: v.label.trim(),
          sku: v.sku.trim(),
          stockQty: Number(v.stockQty),
          lowStockThreshold: Number(v.lowStockThreshold),
          priceOverride: v.priceOverride.trim() ? Number(v.priceOverride) : undefined,
        })),
    };
    try {
      const res = await fetch(isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save that product.");
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
    <form onSubmit={handleSubmit} className="border border-line p-4 sm:p-6">
      <p className="text-xs uppercase tracking-wide text-muted">{isEdit ? "Edit Product" : "New Product"}</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="p-name">
          <input
            id="p-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Category" htmlFor="p-category">
          <select
            id="p-category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClasses}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Price (KES)" htmlFor="p-price">
          <input
            id="p-price"
            type="number"
            min={0}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Discount % (optional)" htmlFor="p-discount">
          <input
            id="p-discount"
            type="number"
            min={0}
            max={100}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Image Label" htmlFor="p-image-label">
          <input
            id="p-image-label"
            value={imageLabel}
            onChange={(e) => setImageLabel(e.target.value)}
            placeholder={name || "Shown while the photo loads"}
            className={inputClasses}
          />
        </FormField>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Visible in the shop
        </label>
      </div>

      <div className="mt-4">
        <FormField label="Description" htmlFor="p-description">
          <textarea
            id="p-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClasses} w-full`}
          />
        </FormField>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-muted">Variants (sizes / options)</p>
        <div className="mt-3 flex flex-col gap-3">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border border-line p-3 sm:grid-cols-5">
              <input
                placeholder="Label, e.g. 42"
                value={v.label}
                onChange={(e) => updateVariant(i, { label: e.target.value })}
                className={`${inputClasses} text-xs`}
              />
              <input
                placeholder="SKU"
                value={v.sku}
                onChange={(e) => updateVariant(i, { sku: e.target.value })}
                className={`${inputClasses} text-xs`}
              />
              <input
                type="number"
                min={0}
                placeholder="Stock qty"
                value={v.stockQty}
                onChange={(e) => updateVariant(i, { stockQty: e.target.value })}
                disabled={Boolean(v.id)}
                title={v.id ? "Adjust existing stock from Stock Adjustments, so it's logged." : undefined}
                className={`${inputClasses} text-xs disabled:cursor-not-allowed disabled:opacity-50`}
              />
              <input
                type="number"
                min={0}
                placeholder="Low-stock at"
                value={v.lowStockThreshold}
                onChange={(e) => updateVariant(i, { lowStockThreshold: e.target.value })}
                className={`${inputClasses} text-xs`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Price override"
                  value={v.priceOverride}
                  onChange={(e) => updateVariant(i, { priceOverride: e.target.value })}
                  className={`${inputClasses} w-full text-xs`}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  disabled={variants.length === 1 || Boolean(v.id)}
                  title={v.id ? "Existing sizes can't be removed — set stock to 0 and relabel instead." : undefined}
                  className="text-xs text-muted hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="mt-2 border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
        >
          Add Variant
        </button>
        {isEdit ? (
          <p className="mt-2 text-xs text-muted">
            Stock quantity for an existing size is locked here — change it from Stock Adjustments
            so the correction is logged. Existing sizes also can&apos;t be removed, since past
            orders and purchase orders may still reference them — set stock to 0 and relabel a
            discontinued one instead. A newly added row here starts at the quantity you enter.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </Button>
        <button type="button" onClick={onCancel} className="text-xs uppercase tracking-wide text-muted hover:text-ink">
          Cancel
        </button>
        {error ? <p className="text-xs text-oxblood">{error}</p> : null}
      </div>
    </form>
  );
}
