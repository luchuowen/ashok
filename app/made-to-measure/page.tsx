import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { PriceChip } from "@/components/ui/PriceChip";
import { QuizBand } from "@/components/ui/QuizBand";
import { Photo } from "@/components/ui/Photo";

const womensMtmImage = undefined; // set to "/photos/made-to-measure/womens-mtm-blazer.jpg" once generated

const included = [
  {
    title: "House block, your numbers",
    body: "Faster than full bespoke because the base pattern already exists — your measurements adjust it.",
  },
  {
    title: "One fitting",
    body: "Usually enough for MTM; a second is offered at no charge if it isn't.",
  },
  {
    title: "2–3 week turnaround",
    body: "From fitting to collection — faster for repeat clients with a measurement on file.",
  },
];

export default function MadeToMeasurePage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Made-to-Measure"
          title="Fitted to you, faster — for men and women."
          intro="A house block, adjusted against your measurements, for occasionwear and everyday pieces — shirts, trousers, dresses, blazers. One fitting, ready in 2–3 weeks."
          priceChip={<PriceChip price={32000} />}
        />
      </Section>

      <Section>
        <QuizBand />
      </Section>

      <Section className="bg-paper text-center sm:text-left">
        <h2 className="text-3xl">Made-to-measure for women</h2>
        <div className="mt-8 grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
          <Photo src={womensMtmImage} label="IMG-41 · women's MTM blazer" aspectRatio="4 / 3" />
          <p className="text-base text-muted">
            Blazers, occasion dresses and tailored separates, fitted the same way as the
            men&apos;s line — same fabric library, same fitting standard.
          </p>
        </div>
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
    </main>
  );
}
