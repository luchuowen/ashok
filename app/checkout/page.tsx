"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isSuitLine, useCart } from "@/app/cart-context";
import { useAuthSession } from "@/app/auth-context";
import { Section } from "@/components/ui/Section";
import { FormField } from "@/components/ui/FormField";
import { SuitPreview } from "@/components/suit/SuitPreview";
import { CurrencyToggle } from "@/components/suit/CurrencyToggle";
import { PromoField, type PromoPreview } from "@/components/suit/PromoField";
import { useDisplayCurrency, useFitProfile } from "@/components/suit/stores";
import { DELIVERY_METHODS, type DeliveryMethodId } from "@/lib/suit/catalogue";
import { depositFor } from "@/lib/suit/pricing";
import { METHOD_LABELS, validateFitProfile } from "@/lib/suit/measurements";
import { formatKes, formatMoney, KES_PER_USD } from "@/lib/currency";

const PENDING_ORDER_KEY = "ashok-pending-order";
const CHECKOUT_DRAFT_KEY = "ashok-checkout-details";
const inputClass = "border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none";

interface Details {
  name: string;
  phone: string;
  email: string;
  delivery: DeliveryMethodId;
  address: string;
  town: string;
  country: string;
  instructions: string;
  plan: "full" | "deposit";
}

const EMPTY: Details = { name: "", phone: "", email: "", delivery: "collect", address: "", town: "", country: "", instructions: "", plan: "full" };

export default function CheckoutPage() {
  const { items, subtotal, hydrated } = useCart();
  const { phone: sessionPhone, name: sessionName } = useAuthSession();
  const [currency, setCurrency] = useDisplayCurrency();
  const [fit, , fitHydrated] = useFitProfile();
  const [d, setD] = useState<Details>(EMPTY);
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const suitLines = items.filter(isSuitLine);
  const hasSuits = suitLines.length > 0;
  const fitIssues = useMemo(() => (hasSuits ? validateFitProfile(fit).filter((i) => i.severity === "error") : []), [hasSuits, fit]);
  const deliveryFee = hasSuits ? DELIVERY_METHODS.find((m) => m.id === d.delivery)?.fee ?? 0 : 0;
  const suitsSubtotal = suitLines.reduce((n, l) => n + l.price * l.qty, 0);
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const discount = promo?.discount ?? 0;
  const total = subtotal - discount + deliveryFee;
  const dueNow = hasSuits && d.plan === "deposit" ? depositFor(total) : total;

  // Restore what they typed last time (not the phone/name of a signed-in
  // customer — those come from the session below).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (raw) setD((prev) => ({ ...prev, ...(JSON.parse(raw) as Partial<Details>) }));
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(d));
    } catch {
      // ignore
    }
  }, [d]);

  // If they're signed in to the portal, use that phone number by default so
  // this purchase shows up on their Orders/Payments pages once it's paid —
  // otherwise this is a guest checkout, and only the manually entered phone
  // links the order (it'll surface in their portal if they later sign in
  // with the same number).
  useEffect(() => {
    if (sessionPhone) setD((prev) => ({ ...prev, phone: prev.phone || sessionPhone }));
  }, [sessionPhone]);
  useEffect(() => {
    if (sessionName) setD((prev) => ({ ...prev, name: prev.name || sessionName }));
  }, [sessionName]);

  const set = <K extends keyof Details>(k: K, v: Details[K]) => {
    setError(null);
    setD((prev) => ({ ...prev, [k]: v }));
  };

  function clientErrors(): string | null {
    if (items.length === 0) return "Your bag is empty.";
    const broken = suitLines.find((l) => l.suit.issue);
    if (broken) return `${broken.name}: ${broken.suit.issue} Reopen it from your bag.`;
    if (!d.phone.trim()) return "Enter a phone number to continue.";
    if (hasSuits && !d.name.trim()) return "Enter your name — it goes on your order and fitting appointment.";
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) return "That email address doesn't look right.";
    if (hasSuits && d.delivery !== "collect" && (d.address.trim().length < 4 || d.town.trim().length < 2)) return "Enter a delivery address and town.";
    if (hasSuits && d.delivery === "international" && d.country.trim().length < 2) return "Enter the destination country.";
    if (hasSuits && d.delivery === "international" && !d.email.trim()) return "Add your email — we'll send overseas order updates there.";
    if (hasSuits && fitIssues.length) return fitIssues[0]!.message;
    if (hasSuits && !terms) return "Please accept the made-to-measure terms.";
    return null;
  }

  async function handlePay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    const problem = clientErrors();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const shopItems = items.filter((i) => !isSuitLine(i));
      const res = await fetch("/api/checkout/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: shopItems.map((item) => ({ productId: item.productId, variantId: item.variantId, qty: item.qty })),
          suits: suitLines.map((item) => ({ lineId: item.variantId, config: item.suit.config, qty: item.qty })),
          fit: hasSuits ? fit : undefined,
          delivery: hasSuits ? { method: d.delivery, address: d.address, town: d.town, country: d.country, instructions: d.instructions } : undefined,
          paymentPlan: hasSuits ? d.plan : "full",
          customerName: d.name,
          customerPhone: d.phone,
          customerEmail: d.email,
          acceptTerms: hasSuits ? terms : undefined,
          promoCode: promo?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not start payment. Try again.");
        setSubmitting(false);
        return;
      }

      try {
        sessionStorage.setItem(
          PENDING_ORDER_KEY,
          JSON.stringify({
            transactionId: data.transactionId,
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            createdAt: Date.now(),
            orderId: data.orderId,
            total: data.total,
            balanceAfterPayment: data.balanceAfterPayment,
            hasSuits: data.hasSuits,
            fitMethod: data.fitMethod,
          }),
        );
      } catch {
        // sessionStorage unavailable — the complete page will fall back to a
        // generic "check your M-Pesa/email" message without item detail.
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!hydrated) return <main className="min-h-[60vh]" />;

  if (items.length === 0) {
    return (
      <main>
        <Section border={false}>
          <h1 className="font-display text-3xl">Checkout</h1>
          <p className="mt-4 text-sm text-muted">Your bag is empty.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/custom-suits/design" className="cta">
              Design a suit
            </Link>
            <Link href="/shop" className="cta ghost">
              Visit the shop
            </Link>
          </div>
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Section border={false}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted" aria-label="Progress">
              <Link href="/cart" className="hover:text-ink">
                Bag
              </Link>
              {hasSuits ? (
                <>
                  <span>›</span>
                  <Link href="/custom-suits/measurements?next=/checkout" className="hover:text-ink">
                    Measurements
                  </Link>
                </>
              ) : null}
              <span>›</span>
              <span className="text-ink">Checkout</span>
            </nav>
            <h1 className="font-display text-3xl">Checkout</h1>
          </div>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>

        <form id="checkout-payment-form" onSubmit={handlePay} noValidate className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          <div className="space-y-10">
            <fieldset>
              <legend className="flex items-center gap-3 text-xl">
                <StepNo n={1} /> Your details
              </legend>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField label={hasSuits ? "Full name" : "Full name (optional)"} htmlFor="customer-name">
                  <input id="customer-name" type="text" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" className={`${inputClass} ${touched && hasSuits && !d.name.trim() ? "!border-oxblood" : ""}`} />
                </FormField>
                <FormField label={hasSuits && d.delivery === "international" ? "Phone (with country code)" : "Phone number (M-Pesa)"} htmlFor="customer-phone">
                  <input id="customer-phone" type="tel" autoComplete="tel" required value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder={hasSuits && d.delivery === "international" ? "+44 7700 900123" : "07XX XXX XXX"} className={`${inputClass} ${touched && !d.phone.trim() ? "!border-oxblood" : ""}`} />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Email (for your receipt and suit specification)" htmlFor="customer-email">
                    <input id="customer-email" type="email" autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" className={inputClass} />
                  </FormField>
                </div>
              </div>
            </fieldset>

            {hasSuits ? (
              <fieldset>
                <legend className="flex items-center gap-3 text-xl">
                  <StepNo n={2} /> How you&rsquo;ll receive it
                </legend>
                <div className="mt-5 grid gap-2">
                  {DELIVERY_METHODS.map((m) => (
                    <label key={m.id} className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${d.delivery === m.id ? "border-ink bg-paper" : "border-line hover:border-ink/50"}`}>
                      <input type="radio" name="delivery" value={m.id} checked={d.delivery === m.id} onChange={() => set("delivery", m.id)} className="mt-1 accent-[rgb(var(--oxblood))]" />
                      <span className="flex-1">
                        <span className="flex justify-between gap-3 text-sm">
                          <span>{m.label}</span>
                          <span>{m.fee ? formatMoney(m.fee, currency) : "Free"}</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">{m.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {d.delivery !== "collect" ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FormField label="Address (building, street, area)" htmlFor="delivery-address">
                        <input id="delivery-address" autoComplete="street-address" value={d.address} onChange={(e) => set("address", e.target.value)} className={`${inputClass} ${touched && d.address.trim().length < 4 ? "!border-oxblood" : ""}`} />
                      </FormField>
                    </div>
                    {d.delivery === "international" ? (
                      <FormField label="Country" htmlFor="delivery-country">
                        <input id="delivery-country" autoComplete="country-name" value={d.country} onChange={(e) => set("country", e.target.value)} className={`${inputClass} ${touched && d.country.trim().length < 2 ? "!border-oxblood" : ""}`} />
                      </FormField>
                    ) : null}
                    <FormField label={d.delivery === "international" ? "City" : "Town"} htmlFor="delivery-town">
                      <input id="delivery-town" autoComplete="address-level2" value={d.town} onChange={(e) => set("town", e.target.value)} placeholder={d.delivery === "nairobi" ? "Nairobi" : ""} className={`${inputClass} ${touched && d.town.trim().length < 2 ? "!border-oxblood" : ""}`} />
                    </FormField>
                    <FormField label="Delivery notes (optional)" htmlFor="delivery-notes">
                      <input id="delivery-notes" value={d.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Gate code, best time…" className={inputClass} />
                    </FormField>
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-muted">Whichever you choose, your fitting happens at the atelier before the suit is finished.</p>
              </fieldset>
            ) : null}

            {hasSuits ? (
              <fieldset>
                <legend className="flex items-center gap-3 text-xl">
                  <StepNo n={3} /> Measurements
                </legend>
                {!fitHydrated ? null : fit && !fitIssues.length ? (
                  <div className="mt-5 flex items-center justify-between gap-4 border border-line bg-paper p-4">
                    <div>
                      <p className="text-sm">{fit.name}</p>
                      <p className="text-xs text-muted">{METHOD_LABELS[fit.method]}</p>
                    </div>
                    <Link href="/custom-suits/measurements?next=/checkout" className="text-xs uppercase tracking-wide underline hover:text-oxblood">
                      Change
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 border border-oxblood/40 bg-oxblood/5 p-4">
                    <p className="text-sm">We need your measurements — or your choice to be measured at the atelier — before you pay.</p>
                    <Link href="/custom-suits/measurements?next=/checkout" className="cta mt-3">
                      Add measurements
                    </Link>
                  </div>
                )}
              </fieldset>
            ) : null}

            {hasSuits ? (
              <fieldset>
                <legend className="flex items-center gap-3 text-xl">
                  <StepNo n={4} /> Payment
                </legend>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["full", "Pay in full", formatMoney(total, currency), "Nothing more to pay at collection."],
                      ["deposit", "Pay a 50% deposit", formatMoney(depositFor(total), currency), `Balance ${formatMoney(total - depositFor(total), currency)} at your fitting.`],
                    ] as const
                  ).map(([id, label, amount, note]) => (
                    <label key={id} className={`flex cursor-pointer items-start gap-3 border p-4 ${d.plan === id ? "border-ink bg-paper" : "border-line hover:border-ink/50"}`}>
                      <input type="radio" name="plan" value={id} checked={d.plan === id} onChange={() => set("plan", id)} className="mt-1 accent-[rgb(var(--oxblood))]" />
                      <span>
                        <span className="block text-sm">{label}</span>
                        <span className="block font-display text-xl">{amount}</span>
                        <span className="block text-xs text-muted">{note}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <label className={`mt-5 flex cursor-pointer items-start gap-3 text-sm ${touched && !terms ? "text-oxblood" : ""}`}>
                  <input type="checkbox" checked={terms} onChange={(e) => {
                      setError(null);
                      setTerms(e.target.checked);
                    }} className="mt-1 accent-[rgb(var(--oxblood))]" />
                  <span>
                    I understand my suit is made to my measurements: design changes are possible until the cloth is cut, fit adjustments are made at my fitting,
                    and any balance is due before collection.
                  </span>
                </label>
              </fieldset>
            ) : null}
          </div>

          <aside className="self-start border border-line p-6 lg:sticky lg:top-32">
            <p className="text-xs uppercase tracking-wide text-muted">Order summary</p>
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3 text-sm">
                  {isSuitLine(item) ? (
                    <span className="h-16 w-12 flex-none border border-line bg-paper">
                      <SuitPreview config={item.suit.config} className="h-full w-full" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {item.variantLabel} · ×{item.qty}
                    </span>
                  </span>
                  <span className="whitespace-nowrap">{formatMoney(item.price * item.qty, currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatMoney(subtotal, currency)}</dd>
              </div>
              {discount ? (
                <div className="flex justify-between text-oxblood">
                  <dt>{promo?.label}</dt>
                  <dd>−{formatMoney(discount, currency)}</dd>
                </div>
              ) : null}
              {hasSuits ? (
                <div className="flex justify-between">
                  <dt className="text-muted">Delivery</dt>
                  <dd>{deliveryFee ? formatMoney(deliveryFee, currency) : "Free"}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t-2 border-ink pt-3 font-medium">
                <dt>Total</dt>
                <dd>{formatMoney(total, currency)}</dd>
              </div>
              {hasSuits && d.plan === "deposit" ? (
                <>
                  <div className="flex justify-between font-medium text-oxblood">
                    <dt>Due now (50%)</dt>
                    <dd>{formatMoney(dueNow, currency)}</dd>
                  </div>
                  <div className="flex justify-between text-muted">
                    <dt>Balance at fitting</dt>
                    <dd>{formatMoney(total - dueNow, currency)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
            <div className="mt-4">
              <PromoField subtotal={subtotal} suitsSubtotal={suitsSubtotal} onChange={setPromo} />
            </div>
            {currency === "USD" ? <p className="mt-3 text-[11px] text-muted">USD shown at approx. KES {KES_PER_USD}/USD ({formatKes(dueNow)}). Card payments can be made in USD; the final amount is confirmed on the payment page.</p> : null}
            {error ? (
              <p className="mt-4 text-sm text-oxblood" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" form="checkout-payment-form" disabled={submitting} className="cta mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Redirecting to payment…" : `Pay ${formatKes(dueNow)}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              You&rsquo;ll be taken to a secure payment page to pay by M-Pesa, card or bank transfer.
            </p>
          </aside>
        </form>
      </Section>
    </main>
  );
}

function StepNo({ n }: { n: number }) {
  return <span className="flex h-7 w-7 items-center justify-center border border-ink font-body text-xs">{n}</span>;
}
