"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import type { Category, Product } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/products"),
      ]);
      const catData = await catRes.json();
      if (!catRes.ok || !catData.ok) {
        setError(catData.error || "Could not load categories.");
        return;
      }
      setError(null);
      setCategories(catData.categories);
      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.ok) setProducts(prodData.products);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const countFor = (id: string) => products.filter((p) => p.categoryId === id).length;

  return (
    <Section border={false}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Catalogue</p>
      <h2 className="text-2xl">Categories</h2>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}

      {categories === null && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : categories && categories.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Slug</th>
                <th className="py-2 pr-4">Sort Order</th>
                <th className="py-2 pr-4">Products</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} productCount={countFor(c.id)} onChanged={load} />
              ))}
            </tbody>
          </table>
        </div>
      ) : categories ? (
        <p className="mt-6 text-sm text-muted">No categories yet.</p>
      ) : null}

      <div className="mt-10 max-w-md">
        <CreateCategoryForm onCreated={load} />
      </div>
    </Section>
  );
}

function CategoryRow({
  category,
  productCount,
  onChanged,
}: {
  category: Category;
  productCount: number;
  onChanged: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const dirty = name.trim() !== category.name || Number(sortOrder) !== category.sortOrder;

  async function handleSave() {
    setSaving(true);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sortOrder: Number(sortOrder) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRowError(data.error || "Could not save.");
        return;
      }
      onChanged();
    } catch {
      setRowError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    setDeleting(true);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRowError(data.error || "Could not delete.");
        return;
      }
      onChanged();
    } catch {
      setRowError("Could not reach the server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr className="border-b border-line align-top">
      <td className="py-2 pr-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClasses} w-full`} />
      </td>
      <td className="py-2 pr-4 text-muted">{category.slug}</td>
      <td className="py-2 pr-4">
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className={`${inputClasses} w-20`}
        />
      </td>
      <td className="py-2 pr-4">{productCount}</td>
      <td className="py-2 pr-4">
        <div className="flex flex-wrap gap-2">
          {dirty ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || productCount > 0}
            title={productCount > 0 ? "Reassign this category's products first" : undefined}
            className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
        {rowError ? <p className="mt-1 text-xs text-oxblood">{rowError}</p> : null}
      </td>
    </tr>
  );
}

function CreateCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sortOrder: Number(sortOrder) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not create that category.");
        return;
      }
      setName("");
      setSortOrder("0");
      onCreated();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-muted">New Category</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <FormField label="Name" htmlFor="cat-name">
          <input
            id="cat-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Belts"
            className={inputClasses}
          />
        </FormField>
        <FormField label="Sort Order" htmlFor="cat-sort">
          <input
            id="cat-sort"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={`${inputClasses} w-20`}
          />
        </FormField>
        <Button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add Category"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-oxblood">{error}</p> : null}
    </form>
  );
}
