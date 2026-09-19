import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { Tag } from "@/components/ui/Tag";

const steps = [
  {
    name: "01 · Consultation",
    body: "30–45 min at Ridgeways. Occasion, budget range and fabric direction — Style Advisor answers feed straight in if you took the quiz.",
    week: "Day 0",
  },
  {
    name: "02 · Measurements",
    body: "A dedicated session, entered once, kept on your record for every order after this one.",
    week: "Day 0–3",
  },
  {
    name: "03 · Cutting",
    body: "Bespoke: your own paper pattern, cut and canvassed by hand. Made-to-measure: house block adjusted to your numbers.",
    week: "Week 1–2",
  },
  {
    name: "04 · First Fitting",
    body: "Basted for bespoke, near-final for made-to-measure. Adjustments marked on the spot.",
    week: "Week 2–3",
  },
  {
    name: "05 · Ready",
    body: "Final fitting, then yours to collect — or delivered, on request.",
    week: "Week 3–4",
  },
];

export default function ProcessPage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="How It Works"
          title="Five visits, roughly — start to finish."
          intro={
            'The same process for bespoke and made-to-measure, with fewer stops for made-to-measure. Real timelines, not "please enquire."'
          }
        />
        <ol className="mt-4 divide-y divide-line">
          {steps.map((step) => (
            <li
              key={step.name}
              className="grid grid-cols-1 gap-2 py-6 text-center sm:grid-cols-[160px_1fr_120px] sm:items-start sm:text-left"
            >
              <p className="font-medium">{step.name}</p>
              <p className="text-sm text-muted">{step.body}</p>
              <Tag>{step.week}</Tag>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
