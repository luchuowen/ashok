import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { Photo } from "@/components/ui/Photo";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("The Atelier", "Meet the Ridgeways workroom behind Ashok Sunny Tailored: master tailors, hand-cut patterns and fittings in person, in Nairobi.", "/atelier");

const masterTailorImage = "/photos/atelier/master-tailor-cutting-table.jpg";

const beliefs = [
  {
    title: "Cut for You",
    body: "Your pattern is created from your measurements and kept for future orders.",
  },
  {
    title: "Fitted Before Finished",
    body: "We fit the garment as it’s made, making adjustments along the way.",
  },
  {
    title: "Clear From the Start",
    body: "We explain the fabric, price and timeline before any work begins.",
  },
];

export default function AtelierPage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="About the House"
          title="Now at Ridgeways"
          intro="Ashok Sunny Tailored is now at Ridgeways, Nairobi. We’ve moved to a brighter, more spacious location while keeping the same team, craftsmanship and personal service you know."
        />
      </Section>

      <Section className="text-center sm:text-left">
        <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
          <Photo src={masterTailorImage} label="IMG-40 · master tailor at the cutting table" aspectRatio="4 / 3" />
          <p className="text-base text-muted">
            Ashok Sunny has built his reputation over many years of tailoring. Today, the same
            team and attention to detail continue at our Ridgeways workshop.
          </p>
        </div>
      </Section>

      <Section className="text-center sm:text-left">
        <h2 className="text-3xl">A New Home for the Craft</h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          We’re now creating and fitting from our Ridgeways workshop, giving us more room to
          work, fit and serve you comfortably. Find us at our new home in Nairobi.
        </p>
      </Section>

      <Section className="text-center sm:text-left">
        <h2 className="text-3xl">Made to Fit You</h2>
        <CardGrid columns={3} className="mt-8">
          {beliefs.map((belief) => (
            <div key={belief.title} className="bg-paper p-6">
              <h3 className="text-xl">{belief.title}</h3>
              <p className="mt-3 text-sm text-muted">{belief.body}</p>
            </div>
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
