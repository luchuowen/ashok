"use client";

import { useCart } from "@/app/cart-context";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const { items, removeItem, subtotal } = useCart();
  const currency = items[0]?.currency ?? "KES";

  return (
    <main>
      <Section border={false}>
        <TitleBand eyebrow="Shop" title="Your Cart" />
      </Section>

      <Section>
        {items.length === 0 ? (
          <div>
            <p className="text-sm text-muted">Your cart is empty.</p>
            <div className="mt-6">
              <Button href="/shop">Continue Shopping</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-line px-4 py-3 text-xs uppercase tracking-wide text-muted">
                      Item
                    </th>
                    <th className="border-b border-line px-4 py-3 text-xs uppercase tracking-wide text-muted">
                      Qty
                    </th>
                    <th className="border-b border-line px-4 py-3 text-xs uppercase tracking-wide text-muted">
                      Price
                    </th>
                    <th className="border-b border-line px-4 py-3 text-xs uppercase tracking-wide text-muted">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td className="border-b border-line px-4 py-3">{item.name}</td>
                      <td className="border-b border-line px-4 py-3">{item.qty}</td>
                      <td className="border-b border-line px-4 py-3">
                        {item.currency} {(item.price * item.qty).toLocaleString("en-KE")}
                      </td>
                      <td className="border-b border-line px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-xs uppercase tracking-wide text-muted hover:text-oxblood"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="border-t-2 border-ink px-4 py-3 font-medium" colSpan={2}>
                      Subtotal
                    </td>
                    <td className="border-t-2 border-ink px-4 py-3 font-medium" colSpan={2}>
                      {currency} {subtotal.toLocaleString("en-KE")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <FormField label="Promo Code" htmlFor="promo">
                  <input
                    id="promo"
                    type="text"
                    placeholder="Enter code"
                    className="border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  />
                </FormField>
                {/* Phase 1 mock — no real promo-code validation yet; this is a no-op. */}
                <Button variant="ghost" onClick={() => undefined}>
                  Apply
                </Button>
              </div>

              <Button href="/checkout">Checkout</Button>
            </div>
          </div>
        )}
      </Section>
    </main>
  );
}
