import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { PriceChip } from "@/components/ui/PriceChip";
import { QuizBand } from "@/components/ui/QuizBand";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Bespoke Suits", "Fully bespoke suits cut from your own paper pattern in Nairobi, made through multiple fittings for a suit that is truly yours.", "/bespoke");

const included = [
  {
    title: "Your paper pattern",
    body: "Drafted new, kept on file — every future order starts from a known-good fit.",
  },
  {
    title: "Hand canvas",
    body: "A floating canvas chest piece, not fused interfacing — moves and ages with you.",
  },
  {
    title: "Two+ fittings",
    body: "Basted fitting, then a final fitting before collection; more if the garment needs it.",
  },
];

export default function BespokePage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Full Bespoke"
          title="Cut from your own pattern, canvassed by hand."
          intro="The house's top tier — a pattern drafted from your measurements alone, hand-canvassed construction, minimum two fittings. For the man who wants a suit that starts and ends with him."
          priceChip={<PriceChip price={65000} />}
        />
      </Section>

      <Section className="text-center sm:text-left">
        <h2 className="text-3xl">What&apos;s included</h2>
        <CardGrid columns={3} className="mt-8">
          {included.map((item) => (
            <div key={item.title} className="bg-paper p-6">
              <h3 className="text-xl">{item.title}</h3>
              <p className="mt-3 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </CardGrid>
      </Section>

      <Section className="text-center sm:text-left">
        <h2 className="text-3xl">Who it&apos;s for</h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Wedding suits, boardroom wardrobes, the one suit you want to stop thinking about once
          it&apos;s right — if you need something in two weeks, Made-to-Measure is the faster
          path.
        </p>
        <Link
          href="/made-to-measure"
          className="mt-4 inline-block text-sm text-oxblood hover:underline"
        >
          Compare with Made-to-Measure →
        </Link>
      </Section>

      <Section>
        <QuizBand />
      </Section>
    </main>
  );
}
