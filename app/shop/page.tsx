import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { QuizBand } from "@/components/ui/QuizBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { Tag } from "@/components/ui/Tag";
import { ProductCard } from "@/components/commerce/ProductCard";
import { products } from "@/lib/fixtures/products";

const filters = ["All", "Shoes", "Ties", "Cufflinks"];

export default function ShopPage() {
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
            <Tag key={filter} variant={filter === "All" ? "stage" : "default"}>
              {filter}
            </Tag>
          ))}
        </div>
        <CardGrid columns={4} className="mt-8 text-center sm:text-left">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
