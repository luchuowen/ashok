"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Tag } from "@/components/ui/Tag";
import { SuitPreview } from "@/components/suit/SuitPreview";
import { SpecList } from "@/components/suit/SpecList";
import type { Order, Payment, OrderStage } from "@/lib/db";
import { stagesFor } from "@/lib/order-stages";
import { BUILD_QUESTIONS, MEASURE_FIELDS, METHOD_LABELS, cmToIn } from "@/lib/suit/measurements";

/**
 * Work ticket for one custom-suit order: everything the cutter, the tailor
 * and the front desk need on one printable page — per-suit drawings and
 * full specification, the fit profile, delivery, payments, stage control.
 */
export default function CustomOrderTicketPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [eta, setEta] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load that order.");
        return;
      }
      setOrder(data.order);
      setPayments(data.payments ?? []);
      setNote(data.order.statusNote ?? "");
      setEta(data.order.estimatedCompletion ?? "");
    } catch {
      setError("Could not reach the server.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) setError(data.error || "Could not save.");
      else await load();
    } finally {
      setSaving(false);
    }
  }

  async function paymentLink() {
    setLinkError(null);
    const res = await fetch(`/api/admin/orders/${params.id}/invoice`, { method: "POST" }).catch(() => null);
    const data = res ? await res.json() : { ok: false };
    if (!res?.ok || !data.ok) setLinkError(data.error || "Could not generate a payment link.");
    else setLink(data.checkoutUrl);
  }

  if (error && !order) return <Section border={false}><p className="text-sm text-oxblood">{error}</p></Section>;
  if (!order) return <Section border={false}><p className="text-sm text-muted">Loading…</p></Section>;

  const fit = order.fitProfile;
  const ref = order.id.slice(-8).toUpperCase();

  return (
    <Section border={false} className="print:!p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <Link href="/admin/custom-orders" className="text-xs uppercase tracking-wide text-muted hover:text-oxblood">
          ← Custom orders
        </Link>
        <button type="button" onClick={() => window.print()} className="cta ghost !px-4 !py-2 text-xs">
          Print work ticket
        </button>
      </div>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-oxblood">Work ticket · {ref}</p>
          <h2 className="mt-1 text-3xl">{order.clientName}</h2>
          <p className="text-sm text-muted">
            {order.clientId}
            {order.customerEmail ? ` · ${order.customerEmail}` : ""} · placed {order.startedAt}
          </p>
        </div>
        <div className="text-right text-sm">
          <Tag variant="stage">{order.stage}</Tag>
          <p className="mt-2">Due {order.estimatedCompletion || "—"}</p>
          <p className="text-muted">Ref {order.reference ?? "—"}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {(order.suits ?? []).map((s, i) => (
            <article key={s.lineId} className="break-inside-avoid">
              <h3 className="text-xl">
                Suit {i + 1} of {order.suits!.length}: {s.qty}× {s.title}
              </h3>
              <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                  {(["front", "back", "lining"] as const).map((v) => (
                    <div key={v} className="border border-line bg-cream">
                      <SuitPreview config={s.config} view={v} className="h-auto w-full" />
                    </div>
                  ))}
                  {s.config.options["suit.pieces"] === "three" ? (
                    <div className="border border-line bg-cream">
                      <SuitPreview config={s.config} view="waistcoat" className="h-auto w-full" />
                    </div>
                  ) : null}
                </div>
                <div>
                  <SpecList groups={s.spec} />
                  <table className="mt-5 w-full text-sm">
                    <tbody>
                      {s.priceLines.map((l, j) => (
                        <tr key={j} className="border-b border-line">
                          <td className="py-1 text-muted">{l.label}</td>
                          <td className="py-1 text-right">KES {l.amount.toLocaleString("en-KE")}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-1 font-medium">Unit price × {s.qty}</td>
                        <td className="py-1 text-right font-medium">KES {(s.unitPrice * s.qty).toLocaleString("en-KE")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          ))}

          {order.items?.length ? (
            <article>
              <h3 className="text-xl">Shop items</h3>
              <ul className="mt-2 text-sm">
                {order.items.map((it) => (
                  <li key={`${it.productId}-${it.variantId}`} className="flex justify-between border-b border-line py-1">
                    <span>
                      {it.qty}× {it.productName} ({it.variantLabel})
                    </span>
                    <span>KES {(it.unitPrice * it.qty).toLocaleString("en-KE")}</span>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          <article className="break-inside-avoid">
            <h3 className="text-xl">Fit profile</h3>
            {fit ? (
              <div className="mt-3 text-sm">
                <p>
                  <span className="font-medium">{fit.name}</span> — {METHOD_LABELS[fit.method]}
                </p>
                {fit.method === "atelier" ? <p className="mt-1 text-oxblood">Customer to be measured at the atelier before cutting.</p> : null}
                {fit.method === "onfile" ? <p className="mt-1">Use the staff measurement record taken {fit.onFileTakenAt} (ID {fit.onFileId}).</p> : null}
                {fit.basics ? (
                  <p className="mt-1 text-muted">
                    Height {fit.basics.height} cm · Weight {fit.basics.weight} kg · Age {fit.basics.age}
                  </p>
                ) : null}
                {fit.method === "estimate" || fit.method === "self" ? (
                  <table className="mt-3 w-full max-w-lg text-sm">
                    <tbody>
                      {MEASURE_FIELDS.map((f) => (
                        <tr key={f.key} className="border-b border-line">
                          <td className="py-1 text-muted">{f.label}</td>
                          <td className="py-1 text-right">{fit.body[f.key] ?? "—"} cm</td>
                          <td className="py-1 text-right text-muted">{fit.body[f.key] ? `${cmToIn(fit.body[f.key]!)}"` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                <p className="mt-3 text-muted">
                  Build:{" "}
                  {BUILD_QUESTIONS.map((q) => `${q.label.toLowerCase()} ${q.options.find((o) => o.id === fit.build[q.key])?.label.toLowerCase()}`).join(" · ")}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No fit profile on this order.</p>
            )}
          </article>
        </div>

        <aside className="space-y-6 print:hidden">
          <div className="border border-line p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Stage</p>
            <select
              value={order.stage}
              disabled={saving}
              onChange={(e) => patch({ stage: e.target.value as OrderStage })}
              className="mt-2 w-full border border-line bg-paper px-2 py-2 text-sm"
            >
              {stagesFor(order.source).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label className="mt-3 block text-xs text-muted">
              Customer-facing note
              <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full border border-line bg-paper px-2 py-2 text-sm text-ink" />
            </label>
            <label className="mt-3 block text-xs text-muted">
              Estimated completion
              <input type="date" value={eta} onChange={(e) => setEta(e.target.value)} className="mt-1 w-full border border-line bg-paper px-2 py-2 text-sm text-ink" />
            </label>
            <button type="button" disabled={saving} onClick={() => patch({ statusNote: note, estimatedCompletion: eta })} className="cta mt-3 w-full !py-2 text-xs">
              Save
            </button>
          </div>

          <div className="border border-line p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Money</p>
            <p className="mt-2 flex justify-between">
              <span className="text-muted">Total</span>
              <span>KES {order.price.toLocaleString("en-KE")}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted">Plan</span>
              <span>{order.paymentPlan === "deposit" ? "50% deposit" : "Pay in full"}</span>
            </p>
            <p className="flex justify-between font-medium">
              <span>Balance</span>
              <span>KES {order.balanceDue.toLocaleString("en-KE")}</span>
            </p>
            <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs">
              {payments.length === 0 ? <li className="text-muted">No payments recorded.</li> : null}
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {p.date} · {p.method}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                  <span className={p.status === "Paid" ? "" : "text-muted"}>
                    KES {p.amount.toLocaleString("en-KE")} {p.status}
                  </span>
                </li>
              ))}
            </ul>
            {order.balanceDue > 0 && order.stage !== "Payment Pending" && order.stage !== "Cancelled" ? (
              <div className="mt-3">
                {link ? (
                  <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-full border border-line bg-paper px-2 py-1 text-xs" />
                ) : (
                  <button type="button" onClick={paymentLink} className="w-full border border-oxblood px-2 py-2 text-xs uppercase tracking-wide text-oxblood hover:bg-oxblood hover:text-cream">
                    Payment link for balance
                  </button>
                )}
                {linkError ? <p className="mt-1 text-xs text-oxblood">{linkError}</p> : null}
                <p className="mt-2 text-[11px] text-muted">Cash or bank payments: record them on the customer&rsquo;s page under Customers.</p>
              </div>
            ) : null}
          </div>

          <div className="border border-line p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Delivery</p>
            {order.delivery ? (
              <>
                <p className="mt-2">{order.delivery.label}</p>
                {order.delivery.address ? (
                  <p className="text-muted">
                    {order.delivery.address}, {order.delivery.town}
                  </p>
                ) : null}
                {order.delivery.instructions ? <p className="text-muted">“{order.delivery.instructions}”</p> : null}
              </>
            ) : (
              <p className="mt-2 text-muted">Collect at the atelier</p>
            )}
          </div>
          <p className="text-[11px] text-muted">Priced against catalogue {order.catalogueVersion ?? "—"}.</p>
        </aside>
      </div>
    </Section>
  );
}
