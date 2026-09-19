"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { QuizBand } from "@/components/ui/QuizBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { Tag } from "@/components/ui/Tag";
import { ProductCard } from "@/components/commerce/ProductCard";
import { products } from "@/lib/fixtures/products";

const filters = ["All", "Shoes", "Ties", "Cufflinks"] as const;
type Filter = (typeof filters)[number];

export default function ShopPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const visibleProducts =
    activeFilter === "All" ? products : products.filter((product) => product.category === activeFilter);

  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Ready to Wear"
          title="Shoes, cufflinks and ties."
          intro="Priced plainly, kept in its own corner of the house — not competing with the bespoke story, complementing it."
        />
      </Section>

      <Section>
        <QuizBand />
      </Section>

      <Section>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          {filters.map((filter) => (
            <button key={filter} type="button" onClick={() => setActiveFilter(filter)}>
              <Tag variant={filter === activeFilter ? "stage" : "default"}>{filter}</Tag>
            </button>
          ))}
        </div>
        {visibleProducts.length === 0 ? (
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
