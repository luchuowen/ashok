"use client";

import { useState } from "react";
import { useCart } from "@/app/cart-context";
import { Section } from "@/components/ui/Section";
import { StepBar } from "@/components/ui/StepBar";
import { FormGrid } from "@/components/ui/FormGrid";
import { FormField } from "@/components/ui/FormField";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";

type PaymentMethod = "mpesa" | "card";

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  // Phase 1 mock: there is no real payment API call here. "Pay" just flips
  // this flag to show an inline confirmation. A real M-Pesa/Pesapal
  // integration is Phase 2.
  const [paid, setPaid] = useState(false);
  const currency = items[0]?.currency ?? "KES";

  return (
    <main>
      <Section border={false}>
        <StepBar steps={["Delivery", "Payment", "Review"]} currentStep={2} />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            {paid ? (
              <div className="border border-line p-6">
                <p className="text-base">
                  Payment simulated — a real M-Pesa/Pesapal integration is Phase 2.
                </p>
              </div>
            ) : (
              <FormGrid columns={1}>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Payment Method</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => setMethod("mpesa")}>
                      <Tag variant={method === "mpesa" ? "stage" : "default"}>M-Pesa</Tag>
                    </button>
                    <button type="button" onClick={() => setMethod("card")}>
                      <Tag variant={method === "card" ? "stage" : "default"}>Card</Tag>
                    </button>
                  </div>
                </div>

                {method === "mpesa" ? (
                  <>
                    <FormField label="M-Pesa Phone Number" htmlFor="mpesa-phone">
                      <input
                        id="mpesa-phone"
                        type="tel"
                        placeholder="07XX XXX XXX"
                        className="border border-line bg-cream px-3 py-2 text-sm focus:border-ink focus:outline-none"
                      />
                    </FormField>
                    <p className="text-sm text-muted">
                      You&rsquo;ll get an STK push on your phone to confirm — no card details
                      needed for M-Pesa.
                    </p>
                  </>
                ) : (
                  <FormGrid columns={2}>
                    <FormField label="Card Number" htmlFor="card-number">
                      <input
                        id="card-number"
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        className="border border-line bg-cream px-3 py-2 text-sm focus:border-ink focus:outline-none"
                      />
                    </FormField>
                    <FormField label="Expiry" htmlFor="card-expiry">
                      <input
                        id="card-expiry"
                        type="text"
                        placeholder="MM/YY"
                        className="border border-line bg-cream px-3 py-2 text-sm focus:border-ink focus:outline-none"
                      />
                    </FormField>
                  </FormGrid>
                )}
              </FormGrid>
            )}
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
              <Button onClick={() => setPaid(true)}>Pay</Button>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
