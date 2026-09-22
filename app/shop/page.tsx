"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { QuizBand } from "@/components/ui/QuizBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { Tag } from "@/components/ui/Tag";
import { ProductCard } from "@/components/commerce/ProductCard";
import type { Category, Product } from "@/lib/inventory";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shop/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) {
          setError(data.error || "Could not load the shop.");
          return;
        }
        setProducts(data.products);
        setCategories(data.categories);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the server.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProducts =
    !products
      ? []
      : activeCategoryId === "all"
        ? products
        : products.filter((product) => product.categoryId === activeCategoryId);

  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Ready to Wear"
          title="Shoes, Cufflinks and Ties"
          intro="Complete your look with carefully selected shoes, cufflinks and ties, all available in one place."
        />
      </Section>

      <Section>
        <QuizBand />
      </Section>

      <Section>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <button type="button" onClick={() => setActiveCategoryId("all")}>
            <Tag variant={activeCategoryId === "all" ? "stage" : "default"}>All</Tag>
          </button>
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => setActiveCategoryId(category.id)}>
              <Tag variant={activeCategoryId === category.id ? "stage" : "default"}>{category.name}</Tag>
            </button>
          ))}
        </div>
        {error ? (
          <p className="mt-8 text-center text-sm text-oxblood sm:text-left">{error}</p>
        ) : !products ? (
          <p className="mt-8 text-center text-sm text-muted sm:text-left">Loading…</p>
        ) : visibleProducts.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted sm:text-left">
            Nothing in this category yet.
          </p>
        ) : (
          <CardGrid columns={4} className="mt-8 text-center sm:text-left">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </CardGrid>
        )}
      </Section>
    </main>
  );
}
