"use client";

import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import type { Customer, Order, Payment, Appointment, ClientMeasurements, Quote, OrderStage } from "@/lib/db";

const inputClasses =
  "border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-oxblood focus:outline-none";

interface ActivityData {
  orders: Order[];
  appointments: Appointment[];
  payments: Payment[];
  quotes: Quote[];
}

interface CustomerDetail {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  appointments: Appointment[];
  measurements: ClientMeasurements[];
  quotes: Quote[];
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => setSignedIn(Boolean(data.signedIn)))
      .catch(() => setSignedIn(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <main>
        <Section border={false}>
          <p className="py-20 text-center text-sm text-muted">Checking staff session…</p>
        </Section>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main>
        <StaffLogin onSignedIn={() => setSignedIn(true)} />
      </main>
    );
  }

  return (
    <main>
      <StaffDashboard onSignOut={() => setSignedIn(false)} />
    </main>
  );
}

function StaffLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      onSignedIn();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section border={false}>
      <div className="mx-auto max-w-sm py-20">
        <h1 className="font-display text-2xl">Staff Sign In</h1>
        <p className="mt-2 text-sm text-muted">Ashok Sunny Tailored — internal use only.</p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <FormField label="Staff Password" htmlFor="password">
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </FormField>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
          {error ? <p className="text-sm text-oxblood">{error}</p> : null}
        </form>
      </div>
    </Section>
  );
}

function StaffDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActivityError(data.error || "Could not load activity.");
        return;
      }
      setActivityError(null);
      setActivity({
        orders: data.orders,
        appointments: data.appointments,
        payments: data.payments,
        quotes: data.quotes,
      });
    } catch {
      setActivityError("Could not reach the server.");
    }
  }, []);

  const loadDetail = useCallback(async (phone: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (res.ok && data.ok) setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (selectedPhone) loadDetail(selectedPhone);
  }, [selectedPhone, loadDetail]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.ok) setResults(data.customers);
    } finally {
      setSearching(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    onSignOut();
  }

  function selectCustomer(phone: string) {
    setSelectedPhone(phone);
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex flex-col items-center justify-between gap-4 border-b border-line px-6 py-8 text-center md:flex-row md:text-left">
        <h1 className="font-display text-3xl">Staff — Ashok Sunny Tailored</h1>
        <Button variant="ghost" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <Section border={false}>
        <form onSubmit={runSearch} className="flex flex-wrap items-end gap-3">
          <FormField label="Find a customer by phone" htmlFor="search">
            <input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="07XX XXX XXX"
              className={inputClasses}
            />
          </FormField>
          <Button type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
          {selectedPhone ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedPhone(null);
                setDetail(null);
              }}
            >
              Back to Activity
            </Button>
          ) : null}
        </form>
        {results.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {results.map((c) => (
              <li key={c.phone}>
                <button type="button" onClick={() => selectCustomer(c.phone)}>
                  <Tag variant={selectedPhone === c.phone ? "stage" : "default"}>
                    {c.name ? `${c.name} — ${c.phone}` : c.phone}
                  </Tag>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {selectedPhone ? (
        <CustomerDetailPanel
          phone={selectedPhone}
          detail={detail}
          loading={detailLoading}
          onChanged={() => {
            loadDetail(selectedPhone);
            loadActivity();
          }}
        />
      ) : (
        <ActivityFeed activity={activity} error={activityError} onSelectCustomer={selectCustomer} />
      )}
    </div>
  );
}

function ActivityFeed({
  activity,
  error,
  onSelectCustomer,
}: {
  activity: ActivityData | null;
  error: string | null;
  onSelectCustomer: (phone: string) => void;
}) {
  if (error) {
    return (
      <Section border={false}>
        <p className="text-sm text-oxblood">{error}</p>
      </Section>
    );
  }
  if (!activity) {
    return (
      <Section border={false}>
        <p className="text-sm text-muted">Loading recent activity…</p>
      </Section>
    );
  }

  return (
    <Section border={false}>
      <h2 className="text-xl">Recent Activity</h2>
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <ActivityColumn
          title="Appointments"
          rows={activity.appointments}
          onSelectCustomer={onSelectCustomer}
          renderRow={(a: Appointment) => `${a.type} — ${a.date} ${a.time} (${a.status})`}
        />
        <ActivityColumn
          title="Orders"
          rows={activity.orders}
          onSelectCustomer={onSelectCustomer}
          renderRow={(o: Order) => `${o.item} — ${o.statusNote}`}
        />
        <ActivityColumn
          title="Payments"
          rows={activity.payments}
          onSelectCustomer={onSelectCustomer}
          renderRow={(p: Payment) => `${p.currency} ${p.amount.toLocaleString("en-KE")} — ${p.status}`}
        />
        <ActivityColumn
          title="Quotes"
          rows={activity.quotes}
          onSelectCustomer={onSelectCustomer}
          renderRow={(q: Quote) => `${q.item} — ${q.currency} ${q.amount.toLocaleString("en-KE")} (${q.status})`}
        />
      </div>
    </Section>
  );
}

function ActivityColumn<T extends { id: string; clientId: string; clientName: string }>({
  title,
  rows,
  renderRow,
  onSelectCustomer,
}: {
  title: string;
  rows: T[];
  renderRow: (row: T) => string;
  onSelectCustomer: (phone: string) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="border border-line p-3 text-sm">
              <button
                type="button"
                className="text-left hover:text-oxblood"
                onClick={() => onSelectCustomer(row.clientId)}
              >
                <span className="block font-medium">{row.clientName || row.clientId}</span>
                <span className="block text-muted">{renderRow(row)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ORDER_STAGES: OrderStage[] = [
  "Consultation",
  "Measurements Taken",
  "Cutting",
  "First Fitting",
  "Final Fitting",
  "Ready for Collection",
  "Collected",
  "Payment Pending",
  "Paid",
];

function CustomerDetailPanel({
  phone,
  detail,
  loading,
  onChanged,
}: {
  phone: string;
  detail: CustomerDetail | null;
  loading: boolean;
  onChanged: () => void;
}) {
  if (loading && !detail) {
    return (
      <Section border={false}>
        <p className="text-sm text-muted">Loading {phone}…</p>
      </Section>
    );
  }
  if (!detail) {
    return (
      <Section border={false}>
        <p className="text-sm text-oxblood">Could not load that customer.</p>
      </Section>
    );
  }

  return (
    <Section border={false}>
      <h2 className="text-xl">{detail.customer.name || phone}</h2>
      <p className="text-sm text-muted">
        {phone}
        {detail.customer.email ? ` · ${detail.customer.email}` : ""}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Appointments</p>
          {detail.appointments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None on file.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between border border-line p-3 text-sm">
                  <span>
                    {a.type} — {a.date} {a.time}
                  </span>
                  <AppointmentStatusControl appointment={a} onChanged={onChanged} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Measurements</p>
          {detail.measurements.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None on file.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.measurements.map((m) => (
                <li key={m.id} className="border border-line p-3 text-sm">
                  <p>Taken {m.takenAt}</p>
                  <p className="text-muted">
                    Chest {m.chest} · Waist {m.waist} · Hips {m.hips} · Shoulder {m.shoulder} · Sleeve{" "}
                    {m.sleeveLength} · Inseam {m.inseam} · Neck {m.neck}
                  </p>
                  {m.notes ? <p className="mt-1 italic text-muted">{m.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <AddMeasurementForm phone={phone} onSaved={onChanged} />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Orders</p>
          {detail.orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None on file.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.orders.map((o) => (
                <li key={o.id} className="border border-line p-3 text-sm">
                  <p>
                    {o.item} — {o.currency} {o.price.toLocaleString("en-KE")}
                  </p>
                  <OrderStageControl order={o} onChanged={onChanged} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <CreateOrderForm phone={phone} onSaved={onChanged} />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Quotes</p>
          {detail.quotes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None on file.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.quotes.map((q) => (
                <li key={q.id} className="border border-line p-3 text-sm">
                  {q.item} — {q.currency} {q.amount.toLocaleString("en-KE")} —{" "}
                  <Tag variant={q.status === "Approved" ? "stage" : "default"}>{q.status}</Tag>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <CreateQuoteForm phone={phone} onSaved={onChanged} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted">Payments</p>
          {detail.payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None on file.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.payments.map((p) => (
                <li key={p.id} className="border border-line p-3 text-sm">
                  {p.date} — {p.currency} {p.amount.toLocaleString("en-KE")} — {p.method} —{" "}
                  <Tag variant={p.status === "Paid" ? "stage" : "default"}>{p.status}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

function AppointmentStatusControl({ appointment, onChanged }: { appointment: Appointment; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);

  async function setStatus(status: Appointment["status"]) {
    setSaving(true);
    try {
      await fetch(`/api/admin/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={appointment.status}
      disabled={saving}
      onChange={(e) => setStatus(e.target.value as Appointment["status"])}
      className="border border-line bg-paper px-2 py-1 text-xs"
    >
      <option value="Scheduled">Scheduled</option>
      <option value="Completed">Completed</option>
      <option value="Cancelled">Cancelled</option>
    </select>
  );
}

function OrderStageControl({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);

  async function setStage(stage: OrderStage) {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, statusNote: stage }),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={order.stage}
      disabled={saving}
      onChange={(e) => setStage(e.target.value as OrderStage)}
      className="mt-1 border border-line bg-paper px-2 py-1 text-xs"
    >
      {ORDER_STAGES.map((stage) => (
        <option key={stage} value={stage}>
          {stage}
        </option>
      ))}
    </select>
  );
}

function AddMeasurementForm({ phone, onSaved }: { phone: string; onSaved: () => void }) {
  const [values, setValues] = useState({
    chest: "",
    waist: "",
    hips: "",
    shoulder: "",
    sleeveLength: "",
    inseam: "",
    neck: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          chest: Number(values.chest),
          waist: Number(values.waist),
          hips: Number(values.hips),
          shoulder: Number(values.shoulder),
          sleeveLength: Number(values.sleeveLength),
          inseam: Number(values.inseam),
          neck: Number(values.neck),
          notes: values.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save that measurement.");
        return;
      }
      setValues({ chest: "", waist: "", hips: "", shoulder: "", sleeveLength: "", inseam: "", neck: "", notes: "" });
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-muted">Add Measurement (cm)</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["chest", "waist", "hips", "shoulder", "sleeveLength", "inseam", "neck"] as const).map((field) => (
          <input
            key={field}
            type="number"
            min={0}
            required
            placeholder={field}
            value={values[field]}
            onChange={(e) => update(field, e.target.value)}
            className={`${inputClasses} text-xs`}
          />
        ))}
      </div>
      <input
        type="text"
        placeholder="Notes (optional)"
        value={values.notes}
        onChange={(e) => update("notes", e.target.value)}
        className={`${inputClasses} mt-2 w-full text-xs`}
      />
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Measurement"}
        </Button>
        {error ? <p className="text-xs text-oxblood">{error}</p> : null}
      </div>
    </form>
  );
}

function CreateOrderForm({ phone, onSaved }: { phone: string; onSaved: () => void }) {
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, item, price: Number(price) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not create that order.");
        return;
      }
      setItem("");
      setPrice("");
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-muted">Start a Bespoke Order</p>
      <div className="mt-3 flex flex-col gap-2">
        <input
          type="text"
          required
          placeholder="Item, e.g. Two-Piece Suit — Navy Wool"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className={`${inputClasses} text-xs`}
        />
        <input
          type="number"
          min={0}
          required
          placeholder="Price (KES)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={`${inputClasses} text-xs`}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create Order"}
        </Button>
        {error ? <p className="text-xs text-oxblood">{error}</p> : null}
      </div>
    </form>
  );
}

function CreateQuoteForm({ phone, onSaved }: { phone: string; onSaved: () => void }) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, item, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not create that quote.");
        return;
      }
      setItem("");
      setAmount("");
      onSaved();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-muted">Send a Quote</p>
      <div className="mt-3 flex flex-col gap-2">
        <input
          type="text"
          required
          placeholder="Item, e.g. Three-Piece Wedding Suit"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className={`${inputClasses} text-xs`}
        />
        <input
          type="number"
          min={0}
          required
          placeholder="Amount (KES)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`${inputClasses} text-xs`}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Sending…" : "Create Quote"}
        </Button>
        {error ? <p className="text-xs text-oxblood">{error}</p> : null}
      </div>
    </form>
  );
}
