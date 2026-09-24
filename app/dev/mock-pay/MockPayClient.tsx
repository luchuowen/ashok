"use client";

import { useEffect, useState } from "react";

export function MockPayClient({ tx }: { tx: string }) {
  const [info, setInfo] = useState<{ amount: number; description: string; accountReference: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/dev/mock-pay?tx=${encodeURIComponent(tx)}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? setInfo(d.tx) : setError(d.error || "Unknown transaction")))
      .catch(() => setError("Could not load transaction"));
  }, [tx]);
  async function finish(outcome: "pay" | "fail") {
    setBusy(true);
    const r = await fetch("/api/dev/mock-pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tx, outcome }) });
    const d = await r.json();
    if (d.ok) window.location.href = d.returnUrl;
    else setError(d.error);
  }
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.2em] text-oxblood">Development · mock payment gateway</p>
      <h1 className="mt-2 text-3xl">Pay with M-Pesa</h1>
      {error ? <p className="mt-6 text-sm text-oxblood">{error}</p> : null}
      {info ? (
        <div className="mt-6 border border-line bg-paper p-5 text-sm">
          <p className="text-muted">{info.description}</p>
          <p className="mt-3 font-display text-3xl">KES {info.amount.toLocaleString("en-KE")}</p>
          <p className="mt-1 text-[11px] text-muted">Ref {info.accountReference} · {tx}</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => finish("pay")} className="cta">Approve payment</button>
            <button type="button" disabled={busy} onClick={() => finish("fail")} className="cta ghost">Decline</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
