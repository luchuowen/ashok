"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Tag } from "@/components/ui/Tag";
import type { PromoCode } from "@/lib/promo-shared";

const input = "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

export default function AdminPromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", kind: "promo", type: "percent", value: "", appliesTo: "all", minSpend: "", maxUses: "", expiresAt: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/promo-codes");
      const data = await res.json();
      if (!res.ok || !data.ok) return setError(data.error || "Could not load codes.");
      setError(null);
      setPromos(data.promos);
    } catch {
      setError("Could not reach the server.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, value: Number(form.value), minSpend: Number(form.minSpend || 0), maxUses: Number(form.maxUses || 0) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return setFormError(data.error || "Could not save.");
      setForm({ ...form, code: "", value: "", description: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: PromoCode) {
    await fetch(`/api/admin/promo-codes/${p.code}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !p.active }) });
    load();
  }

  const gift = form.kind === "giftcard";
  return (
    <Section border={false}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Marketing</p>
      <h2 className="text-2xl">Promo Codes & Gift Cards</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">Customers enter these in the bag or at checkout. Discounts come off the goods (before delivery) and are re-checked on the server at payment. Uses are counted when an order is paid.</p>

      <form onSubmit={create} className="mt-8 grid gap-3 border border-line p-5 sm:grid-cols-3">
        <label className="text-xs text-muted">
          Type
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={`${input} mt-1 w-full`}>
            <option value="promo">Promo code</option>
            <option value="giftcard">Gift card (balance)</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Code
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder={gift ? "GIFT-AB12" : "WEDDING10"} className={`${input} mt-1 w-full uppercase`} />
        </label>
        {!gift ? (
          <label className="text-xs text-muted">
            Discount type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`${input} mt-1 w-full`}>
              <option value="percent">Percent off</option>
              <option value="fixed">KES off</option>
            </select>
          </label>
        ) : null}
        <label className="text-xs text-muted">
          {gift || form.type === "fixed" ? "Amount (KES)" : "Percent (1–90)"}
          <input required type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={`${input} mt-1 w-full`} />
        </label>
        <label className="text-xs text-muted">
          Applies to
          <select value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })} className={`${input} mt-1 w-full`}>
            <option value="all">Whole bag</option>
            <option value="suits">Custom suits only</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Minimum spend (KES)
          <input type="number" min={0} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} className={`${input} mt-1 w-full`} />
        </label>
        {!gift ? (
          <label className="text-xs text-muted">
            Max uses (0 = unlimited)
            <input type="number" min={0} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className={`${input} mt-1 w-full`} />
          </label>
        ) : null}
        <label className="text-xs text-muted">
          Expires (optional)
          <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={`${input} mt-1 w-full`} />
        </label>
        <label className="text-xs text-muted sm:col-span-2">
          Note (staff only)
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${input} mt-1 w-full`} />
        </label>
        <div className="flex items-end gap-3 sm:col-span-3">
          <button type="submit" disabled={saving} className="cta !py-2 text-xs">
            {saving ? "Saving…" : "Create code"}
          </button>
          {formError ? <span className="text-sm text-oxblood">{formError}</span> : null}
        </div>
      </form>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {promos?.length === 0 ? <li className="py-4 text-sm text-muted">No codes yet.</li> : null}
        {(promos ?? []).map((p) => (
          <li key={p.code} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-medium tracking-wide">{p.code}</p>
              <p className="text-xs text-muted">
                {p.kind === "giftcard"
                  ? `Gift card · KES ${p.value.toLocaleString("en-KE")} remaining`
                  : p.type === "percent"
                    ? `${p.value}% off`
                    : `KES ${p.value.toLocaleString("en-KE")} off`}
                {p.appliesTo === "suits" ? " custom suits" : ""}
                {p.minSpend ? ` · min KES ${p.minSpend.toLocaleString("en-KE")}` : ""}
                {p.expiresAt ? ` · until ${p.expiresAt}` : ""} · used {p.uses}
                {p.maxUses ? `/${p.maxUses}` : ""}
                {p.description ? ` · ${p.description}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tag variant={p.active ? "stage" : "default"}>{p.active ? "Active" : "Off"}</Tag>
              <button type="button" onClick={() => toggle(p)} className="text-xs uppercase tracking-wide text-muted hover:text-oxblood">
                {p.active ? "Switch off" : "Switch on"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
