"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSuitLine, maxQtyFor, useCart, type CartItem } from "@/app/cart-context";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { Button } from "@/components/ui/Button";
import { SuitPreview } from "@/components/suit/SuitPreview";
import { SpecList } from "@/components/suit/SpecList";
import { CurrencyToggle } from "@/components/suit/CurrencyToggle";
import { PromoField, type PromoPreview } from "@/components/suit/PromoField";
import { useDisplayCurrency, useFitProfile } from "@/components/suit/stores";
import { buildSpec } from "@/lib/suit/spec";
import { hasBlockingIssues, METHOD_LABELS } from "@/lib/suit/measurements";
import { formatKes, formatMoney, KES_PER_USD } from "@/lib/currency";
import { effectivePrice } from "@/lib/pricing";
import type { Product } from "@/lib/inventory";

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <Cart />
    </Suspense>
  );
}

function Cart() {
  const { items, removeItem, setQty, subtotal, duplicateLine, hydrated } = useCart();
  const [currency, setCurrency] = useDisplayCurrency();
  const [fit, , fitHydrated] = useFitProfile();
  const params = useSearchParams();
  const added = params.get("added");
  const updated = params.get("updated");
  const suitLines = items.filter(isSuitLine);
  const hasSuits = suitLines.length > 0;
  const fitReady = !hasSuits || (fit !== null && !hasBlockingIssues(fit));
  const lineIssue = suitLines.some((l) => l.suit.issue);
  const suitsSubtotal = suitLines.reduce((n, l) => n + l.price * l.qty, 0);
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const discount = promo?.discount ?? 0;
  const count = items.reduce((n, i) => n + i.qty, 0);

  if (!hydrated) {
    return (
      <main>
        <Section border={false}>
          <TitleBand eyebrow="Your bag" title="Your Bag" />
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Section border={false} className="!pb-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <TitleBand eyebrow="Your bag" title={count ? `Your Bag · ${count} item${count === 1 ? "" : "s"}` : "Your Bag"} />
          {items.length ? <CurrencyToggle value={currency} onChange={setCurrency} /> : null}
        </div>
        {added || updated ? (
          <p role="status" className="mt-6 border border-oxblood/30 bg-oxblood/5 px-4 py-3 text-sm">
            {added ? "Your suit is in the bag." : "Your suit has been updated."}{" "}
            {hasSuits && !fitReady ? "Next, add your measurements — or choose to be measured at the atelier." : "Ready when you are."}
          </p>
        ) : null}
      </Section>

      <Section className="!pt-10">
        {items.length === 0 ? (
          <div className="grid gap-8 text-center sm:text-left md:grid-cols-2">
            <div>
              <p className="text-sm text-muted">Your bag is empty.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button href="/custom-suits/design">Design a suit</Button>
                <Button href="/shop" variant="ghost">
                  Visit the shop
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <ul className="divide-y divide-line border-y border-line">
              {items.map((item) =>
                isSuitLine(item) ? (
                  <SuitRow
                    key={item.variantId}
                    item={item}
                    currency={currency}
                    highlight={item.variantId === added || item.variantId === updated}
                    onQty={(q) => setQty(item.productId, item.variantId, q)}
                    onRemove={() => removeItem(item.productId, item.variantId)}
                    onDuplicate={() => duplicateLine(item.productId, item.variantId)}
                  />
                ) : (
                  <ProductRow key={`${item.productId}-${item.variantId}`} item={item} currency={currency} onQty={(q) => setQty(item.productId, item.variantId, q)} onRemove={() => removeItem(item.productId, item.variantId)} />
                ),
              )}
            </ul>

            <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
              {hasSuits && fitHydrated ? (
                <div className="border border-line bg-paper p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-oxblood">Measurements</p>
                  {fit && !hasBlockingIssues(fit) ? (
                    <>
                      <p className="mt-2 font-display text-xl">{fit.name}</p>
                      <p className="text-xs text-muted">{METHOD_LABELS[fit.method]}</p>
                      <Link href="/custom-suits/measurements?next=/cart" className="mt-3 inline-block text-xs uppercase tracking-wide underline hover:text-oxblood">
                        Modify
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm">Your suit is cut to your measurements. Add them now, use the ones we hold, or choose to be measured at the atelier.</p>
                      <Link href="/custom-suits/measurements?next=/checkout" className="cta ghost mt-4 w-full">
                        Add your measurements
                      </Link>
                    </>
                  )}
                </div>
              ) : null}

              <div className="border border-line p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatMoney(subtotal, currency)}</span>
                </div>
                {discount ? (
                  <div className="mt-2 flex justify-between text-sm text-oxblood">
                    <span>Discount</span>
                    <span>−{formatMoney(discount, currency)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted">Delivery</span>
                  <span className="text-muted">{hasSuits ? "Free collection · or from KES 600" : "Collect in store"}</span>
                </div>
                <div className="mt-3">
                  <PromoField subtotal={subtotal} suitsSubtotal={suitsSubtotal} onChange={setPromo} />
                </div>
                <div className="mt-4 flex justify-between border-t-2 border-ink pt-3 font-medium">
                  <span>Total</span>
                  <span>{formatMoney(subtotal - discount, currency)}</span>
                </div>
                {currency === "USD" ? (
                  <p className="mt-2 text-[11px] text-muted">
                    USD shown at approx. KES {KES_PER_USD}/USD ({formatKes(subtotal - discount)}). The final amount is confirmed on the payment page.
                  </p>
                ) : null}
                {hasSuits ? <p className="mt-2 text-[11px] text-muted">Pay in full, or a 50% deposit with the balance at your fitting.</p> : null}
                <div className="mt-5">
                  {lineIssue ? (
                    <p className="text-sm text-oxblood" role="alert">
                      A suit in your bag needs attention before checkout — reopen it in the designer.
                    </p>
                  ) : fitReady ? (
                    <Link href="/checkout" className="cta w-full">
                      Secure checkout
                    </Link>
                  ) : (
                    <Link href="/custom-suits/measurements?next=/checkout" className="cta w-full">
                      Continue — measurements
                    </Link>
                  )}
                </div>
                <p className="mt-3 text-center text-[11px] text-muted">M-Pesa · Card · Bank — via our secure payment page</p>
              </div>
              <div className="flex justify-between text-xs uppercase tracking-wide">
                <Link href="/custom-suits/design" className="text-muted hover:text-oxblood">
                  + Design another suit
                </Link>
                <Link href="/shop" className="text-muted hover:text-oxblood">
                  Shop accessories
                </Link>
              </div>
            </aside>
          </div>
        )}
      </Section>

      {hasSuits ? <CompleteTheLook currency={currency} /> : null}
    </main>
  );
}

function QtyStepper({ qty, max, label, onQty }: { qty: number; max: number; label: string; onQty: (q: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Decrease ${label} quantity`} disabled={qty <= 1} onClick={() => onQty(qty - 1)} className="h-7 w-7 border border-line text-muted hover:text-oxblood disabled:opacity-40">
        −
      </button>
      <span className="min-w-[1.5rem] text-center text-sm">{qty}</span>
      <button type="button" aria-label={`Increase ${label} quantity`} disabled={qty >= max} onClick={() => onQty(qty + 1)} className="h-7 w-7 border border-line text-muted hover:text-oxblood disabled:opacity-40">
        +
      </button>
    </div>
  );
}

function SuitRow({
  item,
  currency,
  highlight,
  onQty,
  onRemove,
  onDuplicate,
}: {
  item: CartItem & { suit: NonNullable<CartItem["suit"]> };
  currency: "KES" | "USD";
  highlight: boolean;
  onQty: (q: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const spec = useMemo(() => buildSpec(item.suit.config), [item.suit.config]);
  return (
    <li className={`flex gap-4 py-5 sm:gap-6 ${highlight ? "bg-oxblood/[0.03]" : ""}`}>
      <Link href={`/custom-suits/design?edit=${encodeURIComponent(item.variantId)}&step=review`} className="block w-24 flex-none border border-line bg-paper sm:w-32" aria-label={`Edit ${item.name}`}>
        <SuitPreview config={item.suit.config} className="h-auto w-full" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col justify-between gap-1 sm:flex-row">
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight">{item.name}</p>
            <p className="mt-1 text-xs text-muted">{item.variantLabel}</p>
          </div>
          <p className="whitespace-nowrap text-sm">{formatMoney(item.price * item.qty, currency)}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs uppercase tracking-wide">
          <QtyStepper qty={item.qty} max={maxQtyFor(item)} label={item.name} onQty={onQty} />
          <Link href={`/custom-suits/design?edit=${encodeURIComponent(item.variantId)}&step=style`} className="text-ink hover:text-oxblood">
            Edit design
          </Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-muted hover:text-oxblood">
            {open ? "Hide details" : "Full details"}
          </button>
          <button type="button" onClick={onDuplicate} className="text-muted hover:text-oxblood">
            Duplicate
          </button>
          <button type="button" onClick={onRemove} className="text-muted hover:text-oxblood">
            Remove
          </button>
        </div>
        {item.suit.issue ? (
          <p className="mt-3 border border-oxblood/40 bg-oxblood/5 px-3 py-2 text-xs text-oxblood" role="alert">
            {item.suit.issue}{" "}
            <Link href={`/custom-suits/design?edit=${encodeURIComponent(item.variantId)}&step=review`} className="underline">
              Fix in the designer
            </Link>
          </p>
        ) : null}
        {open ? (
          <div className="mt-4 border border-line bg-paper p-4">
            <SpecList groups={spec} compact />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ProductRow({ item, currency, onQty, onRemove }: { item: CartItem; currency: "KES" | "USD"; onQty: (q: number) => void; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-4 py-5">
      <div className="min-w-0 flex-1">
        <Link href={`/shop/${item.slug}`} className="text-sm hover:text-oxblood">
          {item.name}
        </Link>
        <p className="text-xs text-muted">{item.variantLabel}</p>
        <div className="mt-2 flex items-center gap-5 text-xs uppercase tracking-wide">
          <QtyStepper qty={item.qty} max={maxQtyFor(item)} label={item.name} onQty={onQty} />
          <button type="button" onClick={onRemove} className="text-muted hover:text-oxblood">
            Remove
          </button>
        </div>
      </div>
      <p className="whitespace-nowrap text-sm">{formatMoney(item.price * item.qty, currency)}</p>
    </li>
  );
}

/** Cross-sell from the live shop catalogue once there's a suit in the bag. */
function CompleteTheLook({ currency }: { currency: "KES" | "USD" }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((d) => !cancelled && setProducts(d.ok ? (d.products as Product[]) : []))
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, []);
  const picks = (products ?? []).filter((p) => p.active && p.variants.some((v) => v.stockQty > 0)).slice(0, 4);
  if (!picks.length) return null;
  return (
    <Section>
      <h2 className="text-2xl">Complete the look</h2>
      <ul className="mt-6 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
        {picks.map((p) => (
          <li key={p.id} className="bg-cream">
            <Link href={`/shop/${p.slug}`} className="block p-4 hover:bg-paper">
              <div className="aspect-square overflow-hidden border border-line bg-paper">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <p className="mt-3 text-sm">{p.name}</p>
              <p className="text-xs text-muted">{formatMoney(effectivePrice(p), currency)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
