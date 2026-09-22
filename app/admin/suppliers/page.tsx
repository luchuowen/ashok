"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import type { Supplier } from "@/lib/inventory";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/suppliers");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load suppliers.");
        return;
      }
      setError(null);
      setSuppliers(data.suppliers);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Section border={false}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Purchasing</p>
      <h2 className="text-2xl">Suppliers</h2>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}

      {suppliers === null && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : suppliers && suppliers.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <Fragment key={s.id}>
                  <tr className="border-b border-line align-top">
                    <td className="py-2 pr-4">{s.name}</td>
                    <td className="py-2 pr-4 text-muted">{s.contactName || "—"}</td>
                    <td className="py-2 pr-4 text-muted">{s.phone || "—"}</td>
                    <td className="py-2 pr-4 text-muted">{s.email || "—"}</td>
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                        className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted hover:border-oxblood hover:text-oxblood"
                      >
                        {editingId === s.id ? "Close" : "Edit"}
                      </button>
                    </td>
                  </tr>
                  {editingId === s.id ? (
                    <tr className="border-b border-line">
                      <td colSpan={5} className="py-4">
                        <SupplierForm
                          supplier={s}
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
      ) : (
        <p className="mt-6 text-sm text-muted">No suppliers yet.</p>
      )}

      <div className="mt-10 max-w-lg">
        <SupplierForm onSaved={load} onCancel={() => undefined} />
      </div>
    </Section>
  );
}

function SupplierForm({
  supplier,
  onSaved,
  onCancel,
}: {
  supplier?: Supplier;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(supplier);
  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/admin/suppliers/${supplier!.id}` : "/api/admin/suppliers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactName, phone, email, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save that supplier.");
        return;
      }
      if (!isEdit) {
        setName("");
        setContactName("");
        setPhone("");
        setEmail("");
        setNotes("");
      }
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{isEdit ? "Edit Supplier" : "New Supplier"}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Name" htmlFor="sup-name">
          <input id="sup-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
        </FormField>
        <FormField label="Contact Person" htmlFor="sup-contact">
          <input
            id="sup-contact"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Phone" htmlFor="sup-phone">
          <input id="sup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClasses} />
        </FormField>
        <FormField label="Email" htmlFor="sup-email">
          <input
            id="sup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
          />
        </FormField>
      </div>
      <div className="mt-3">
        <FormField label="Notes" htmlFor="sup-notes">
          <input id="sup-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClasses} />
        </FormField>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Supplier"}
        </Button>
        {isEdit ? (
          <button type="button" onClick={onCancel} className="text-xs uppercase tracking-wide text-muted hover:text-ink">
            Cancel
          </button>
        ) : null}
        {error ? <p className="text-xs text-oxblood">{error}</p> : null}
      </div>
    </form>
  );
}
