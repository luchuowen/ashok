"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { Photo } from "@/components/ui/Photo";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { products } from "@/lib/fixtures/products";
import { useCart } from "@/app/cart-context";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = products.find((p) => p.slug === params.slug);
  const { addItem } = useCart();

  if (!product) {
    notFound();
  }

  const related = products.filter((p) => p.slug !== product.slug).slice(0, 2);

  return (
    <main>
      <Section border={false}>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 items-start">
          <Photo src={product.image} label={product.imageLabel} aspectRatio="1 / 1" priority />

          <div className="text-center sm:text-left">
            <h1 className="font-display text-3xl">{product.name}</h1>
            <p className="mt-3 text-lg text-oxblood">
              {product.currency} {product.price.toLocaleString("en-KE")}
            </p>
            <p className="mt-4 text-sm text-muted">{product.description}</p>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-wide text-muted">Size</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                {product.sizes.map((size, index) => (
                  // Decorative only in Phase 1 — the first size is shown as
                  // "selected"; there's no real size-picker state yet.
                  <Tag key={size} variant={index === 0 ? "stage" : "default"}>
                    {size}
                  </Tag>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <Button
                onClick={() =>
                  addItem({
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    currency: product.currency,
                  })
                }
              >
                Add to Cart
              </Button>
            </div>

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
                <Photo src={item.image} label={item.imageLabel} aspectRatio="1 / 1" />
                <p className="mt-3 text-sm group-hover:text-oxblood">{item.name}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
    </main>
  );
}
