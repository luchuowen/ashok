"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { Photo } from "@/components/ui/Photo";
import { Tag } from "@/components/ui/Tag";
import { Quote } from "@/components/ui/Quote";
import { portfolioItems, type PortfolioItem } from "@/lib/fixtures/portfolio";

const filters = ["All", "Wedding", "Business", "Occasionwear"] as const;
type Filter = (typeof filters)[number];

// Portfolio items are tagged by garment/engagement type (Wedding, Corporate,
// Bespoke Suit, Made-to-Measure); the filter row groups by occasion instead,
// so each tag maps to the occasion filter it belongs under. Corporate work
// falls under "Business"; general bespoke and made-to-measure pieces (not
// tied to a wedding or corporate order) fall under "Occasionwear".
const tagToFilter: Record<PortfolioItem["tag"], Exclude<Filter, "All">> = {
  Wedding: "Wedding",
  Corporate: "Business",
  "Bespoke Suit": "Occasionwear",
  "Made-to-Measure": "Occasionwear",
};

export default function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const visibleItems =
    activeFilter === "All"
      ? portfolioItems
      : portfolioItems.filter((item) => tagToFilter[item.tag] === activeFilter);

  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Finished Work"
          title="Our Work and Our Clients"
          intro="See the suits and garments we’ve made, along with the stories behind them. Real work, real clients, and what they had to say about their experience."
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          {filters.map((filter) => (
            <button key={filter} type="button" onClick={() => setActiveFilter(filter)}>
              <Tag variant={filter === activeFilter ? "stage" : "default"}>{filter}</Tag>
            </button>
          ))}
        </div>
        {visibleItems.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted sm:text-left">
            Nothing in this category yet.
          </p>
        ) : (
          <CardGrid columns={4} className="mt-8">
            {visibleItems.map((item) => (
              <div key={item.id} className="bg-paper p-6 text-center sm:text-left">
                <Photo src={item.image} label={item.imageLabel} aspectRatio="3 / 4" />
                <p className="mt-2 text-sm">{item.title}</p>
                <Tag>{item.tag}</Tag>
              </div>
            ))}
          </CardGrid>
        )}
      </Section>
      <Section>
        <Quote attribution="A CLIENT, EXECUTIVE WARDROBE, 2026">
          Dressed for the room I was about to walk into — boardroom, this time.
        </Quote>
      </Section>
    </main>
  );
}
