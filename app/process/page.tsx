import { Section } from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Photo } from "@/components/ui/Photo";
import { Tag } from "@/components/ui/Tag";

const introText =
  'The same process for bespoke and made-to-measure, with fewer stops for made-to-measure. Real timelines, not "please enquire."';

const pullQuote =
  "Every measurement, fitting note and fabric choice stays on your record — the next order starts at step three.";

const steps = [
  {
    number: "01",
    name: "Consultation",
    body: "30–45 min at Ridgeways. Occasion, budget range and fabric direction — Style Advisor answers feed straight in if you took the quiz.",
    week: "Day 0",
    image: undefined as string | undefined,
    imageLabel: "IMG-45 · consultation desk",
  },
  {
    number: "02",
    name: "Measurements",
    body: "A dedicated session, entered once, kept on your record for every order after this one.",
    week: "Day 0–3",
    image: undefined as string | undefined,
    imageLabel: "IMG-46 · measurement record",
  },
  {
    number: "03",
    name: "Cutting",
    body: "Bespoke: your own paper pattern, cut and canvassed by hand. Made-to-measure: house block adjusted to your numbers.",
    week: "Week 1–2",
    image: "/photos/home/cutting-table.jpg" as string | undefined,
    imageLabel: "IMG-02 · cutting table",
  },
  {
    number: "04",
    name: "First Fitting",
    body: "Basted for bespoke, near-final for made-to-measure. Adjustments marked on the spot.",
    week: "Week 2–3",
    image: "/photos/home/fitting-session.jpg" as string | undefined,
    imageLabel: "IMG-04 · fitting session",
  },
  {
    number: "05",
    name: "Ready",
    body: "Final fitting, then yours to collect — or delivered, on request.",
    week: "Week 3–4",
    image: "/photos/portfolio/charcoal-three-piece.jpg" as string | undefined,
    imageLabel: "IMG-47 · finished garment",
  },
];

export default function ProcessPage() {
  return (
    <main>
      <Section border={false}>
        {/* Masthead */}
        <div className="flex flex-col gap-8 border-b border-line pb-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left">
            <Eyebrow>How It Works</Eyebrow>
            <h1 className="mt-3 text-4xl italic md:text-5xl">Five visits, roughly — start to finish.</h1>
            <p className="mx-auto mt-4 max-w-md text-base text-muted sm:mx-0">{introText}</p>
          </div>
          <div className="mx-auto text-center sm:mx-0 sm:flex-shrink-0 sm:text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-oxblood">The Atelier Journal</p>
            <p className="mt-1 italic text-muted">N&deg; 05 &middot; Five Stages</p>
          </div>
        </div>
      </Section>

      {/* Alternating steps — each its own full-bleed band so the
          cream/white alternation runs edge to edge, not just inside the
          max-w-6xl column. Odd steps sit on white (bg-paper) instead of
          the page's default cream, breaking up what was one long beige
          field. The image column is now ~58% of the row (was a fixed
          320-380px next to a much wider text column) so it actually reads
          as the visual lead instead of an afterthought floating in empty
          space. */}
      {steps.map((step, index) => (
        <Section key={step.number} className={index % 2 === 1 ? "bg-paper" : ""}>
          <div
            className={`flex flex-col items-center gap-10 py-14 sm:items-center sm:gap-14 md:gap-16 md:py-16 ${
              index % 2 === 1 ? "sm:flex-row-reverse" : "sm:flex-row"
            }`}
          >
            <div className="text-center sm:w-[38%] sm:flex-shrink-0 sm:text-left">
              <p className="text-sm italic text-oxblood">{step.number}</p>
              <h3 className="mt-2 text-3xl">{step.name}</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted sm:mx-0">{step.body}</p>
              <div className="mt-5">
                <Tag variant={index === steps.length - 1 ? "stage" : "default"}>{step.week}</Tag>
              </div>
            </div>
            <Photo
              src={step.image}
              label={step.imageLabel}
              alt={step.name}
              aspectRatio="3 / 2"
              className="w-full sm:flex-1"
              sizes="(min-width: 640px) 58vw, 100vw"
            />
          </div>
        </Section>
      ))}

      <Section className={3 % 2 === 1 ? "bg-paper" : ""}>
        <div className="py-14 text-center md:py-16">
          <p className="text-3xl italic text-oxblood">&ldquo;</p>
          <p className="mx-auto max-w-xl text-2xl italic leading-snug">{pullQuote}</p>
        </div>
      </Section>
    </main>
  );
}
