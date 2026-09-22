"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { Photo } from "@/components/ui/Photo";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { effectivePrice, type Product, type ProductVariant } from "@/lib/inventory";
import { useCart } from "@/app/cart-context";
import { useEffect, useState } from "react";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shop/products/${encodeURIComponent(params.slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) {
          setProduct(null);
          return;
        }
        setProduct(data.product);
        setSelectedVariant(data.product.variants[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    fetch("/api/shop/products")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        setRelated(
          (data.products as Product[]).filter((p: Product) => p.slug !== product.slug).slice(0, 2),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [product]);

  useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  if (product === null) {
    notFound();
  }
  if (product === undefined) {
    return (
      <main>
        <Section border={false}>
          <p className="py-20 text-center text-sm text-muted">Loading…</p>
        </Section>
      </main>
    );
  }

  const price = effectivePrice(product, selectedVariant ?? undefined);
  const onSale = price !== product.price;
  const outOfStock = product.variants.every((v) => v.stockQty <= 0);
  const selectedOutOfStock = (selectedVariant?.stockQty ?? 0) <= 0;

  return (
    <main>
      <Section border={false}>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 items-start">
          <Photo src={product.images[0]} label={product.imageLabel} aspectRatio="1 / 1" priority />

          <div className="text-center sm:text-left">
            <h1 className="font-display text-3xl">{product.name}</h1>
            <p className="mt-3 text-lg">
              {onSale ? (
                <>
                  <span className="mr-2 text-oxblood">
                    {product.currency} {price.toLocaleString("en-KE")}
                  </span>
                  <span className="text-muted line-through">
                    {product.currency} {product.price.toLocaleString("en-KE")}
                  </span>
                </>
              ) : (
                <span className="text-oxblood">
                  {product.currency} {price.toLocaleString("en-KE")}
                </span>
              )}
            </p>
            <p className="mt-4 text-sm text-muted">{product.description}</p>

            {outOfStock ? (
              <p className="mt-6 text-sm text-oxblood">Currently out of stock — check back soon.</p>
            ) : (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-muted">Size</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={variant.stockQty <= 0}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setSizeError(false);
                      }}
                      className={variant.stockQty <= 0 ? "opacity-40" : ""}
                    >
                      <Tag variant={selectedVariant?.id === variant.id ? "stage" : "default"}>
                        {variant.label}
                        {variant.stockQty <= 0 ? " — Out of Stock" : ""}
                      </Tag>
                    </button>
                  ))}
                </div>
                {sizeError ? <p className="mt-2 text-sm text-oxblood">Pick a size first.</p> : null}
                {selectedVariant && selectedVariant.stockQty > 0 && selectedVariant.stockQty <= selectedVariant.lowStockThreshold ? (
                  <p className="mt-2 text-xs text-oxblood">
                    Only {selectedVariant.stockQty} left in {selectedVariant.label}.
                  </p>
                ) : null}
              </div>
            )}

            {!outOfStock ? (
              <div className="mt-8">
                <Button
                  disabled={selectedOutOfStock}
                  onClick={() => {
                    if (!selectedVariant) {
                      setSizeError(true);
                      return;
                    }
                    addItem({
                      productId: product.id,
                      variantId: selectedVariant.id,
                      variantLabel: selectedVariant.label,
                      slug: product.slug,
                      name: product.name,
                      price: effectivePrice(product, selectedVariant),
                      currency: product.currency,
                    });
                    setJustAdded(true);
                  }}
                >
                  {justAdded ? "Added ✓" : "Add to Cart"}
                </Button>
                {justAdded ? (
                  <p className="mt-3 text-sm text-oxblood">
                    Added to cart —{" "}
                    <Link href="/cart" className="underline hover:no-underline">
                      view cart
                    </Link>
                    .
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className="mt-4 text-sm text-muted">
              M-Pesa or card at checkout · Delivered in Nairobi in 2–3 days, collect in-store at
              Ridgeways.
            </p>
          </div>
        </div>
      </Section>

      {related.length > 0 ? (
        <Section className="bg-paper text-center sm:text-left">
          <p className="text-xs uppercase tracking-wide text-muted">Pairs well with</p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-8 sm:mx-0 sm:grid-cols-2">
            {related.map((item) => (
              <Link key={item.slug} href={`/shop/${item.slug}`} className="group block">
                <Photo src={item.images[0]} label={item.imageLabel} aspectRatio="1 / 1" />
                <p className="mt-3 text-sm group-hover:text-oxblood">{item.name}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
    </main>
  );
}
