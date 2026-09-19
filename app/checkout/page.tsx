"use client";

import { useState } from "react";
import { useCart } from "@/app/cart-context";
import { Section } from "@/components/ui/Section";
import { StepBar } from "@/components/ui/StepBar";
import { FormGrid } from "@/components/ui/FormGrid";
import { FormField } from "@/components/ui/FormField";

const PENDING_ORDER_KEY = "ashok-pending-order";

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = items[0]?.currency ?? "KES";

  async function handlePay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number to continue.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.productId, qty: item.qty })),
          customerName: name,
          customerPhone: phone,
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

  return (
    <main>
      <Section border={false}>
        <StepBar steps={["Delivery", "Payment", "Review"]} currentStep={2} />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <form id="checkout-payment-form" onSubmit={handlePay}>
              <FormGrid columns={1}>
                <FormField label="Full Name" htmlFor="customer-name">
                  <input
                    id="customer-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  />
                </FormField>
                <FormField label="Phone Number" htmlFor="customer-phone">
                  <input
                    id="customer-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  />
                </FormField>
                <p className="text-sm text-muted">
                  You&rsquo;ll be taken to a secure payment page to pay by M-Pesa, card or bank
                  transfer.
                </p>
                {error ? <p className="text-sm text-oxblood">{error}</p> : null}
              </FormGrid>
            </form>
          </div>

          <div className="border border-line p-6">
            <p className="text-xs uppercase tracking-wide text-muted">Order Summary</p>
            <ul className="mt-4 flex flex-col gap-3">
              {items.length === 0 ? (
                <li className="text-sm text-muted">No items in cart.</li>
              ) : (
                items.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between text-sm">
                    <span>
                      {item.name} × {item.qty}
                    </span>
                    <span>
                      {item.currency} {(item.price * item.qty).toLocaleString("en-KE")}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-6 flex items-center justify-between border-t-2 border-ink pt-4 font-medium">
              <span>Subtotal</span>
              <span>
                {currency} {subtotal.toLocaleString("en-KE")}
              </span>
            </div>
            <div className="mt-6">
              <button
                type="submit"
                form="checkout-payment-form"
                disabled={submitting || items.length === 0}
                className="cta disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Redirecting to payment…" : "Pay"}
              </button>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
