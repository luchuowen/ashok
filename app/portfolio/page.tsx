import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { Tag } from "@/components/ui/Tag";
import { Quote } from "@/components/ui/Quote";
import { portfolioItems } from "@/lib/fixtures/portfolio";

const filters = ["All", "Wedding", "Business", "Occasionwear"];

export default function PortfolioPage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Finished Work"
          title="Garments and the people who commissioned them."
          intro="Portfolio and client stories in one place — a finished jacket next to the sentence someone actually said about it."
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          {filters.map((filter) => (
            <Tag key={filter} variant={filter === "All" ? "stage" : "default"}>
              {filter}
            </Tag>
          ))}
        </div>
        <CardGrid columns={4} className="mt-8">
          {portfolioItems.map((item) => (
            <div key={item.id} className="bg-paper p-6 text-center sm:text-left">
              <ImagePlaceholder label={item.imageLabel} aspectRatio="3 / 4" />
              <p className="mt-2 text-sm">{item.title}</p>
              <Tag>{item.tag}</Tag>
            </div>
          ))}
        </CardGrid>
      </Section>
      <Section className="bg-paper">
        <Quote attribution="A CLIENT, EXECUTIVE WARDROBE, 2026">
          Dressed for the room I was about to walk into — boardroom, this time.
        </Quote>
      </Section>
    </main>
  );
}
