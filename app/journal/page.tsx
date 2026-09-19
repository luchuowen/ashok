import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { Ribbon } from "@/components/ui/Ribbon";

const teasers = [
  {
    title: "Caring for hand-canvassed wool",
    body: "Why you shouldn't dry-clean it every week.",
    image: "IMG-60 · wool care",
  },
  {
    title: "What 'canvas' actually means",
    body: "A short explainer on construction, in plain language.",
    image: "IMG-61 · canvas construction",
  },
  {
    title: "Dressing for a Nairobi wedding season",
    body: "Fabric weight notes for the calendar here, specifically.",
    image: "IMG-62 · wedding season style",
  },
];

export default function JournalPage() {
  return (
    <main>
      <Section border={false}>
        <div className="mb-3">
          <Ribbon>Phase 2 — Not In The Initial Build</Ribbon>
        </div>
        <TitleBand
          eyebrow="Journal"
          title="Notes from the workshop."
          intro="Fabric care, style guides, behind-the-scenes — built after the commerce core ships, so it doesn't slow the launch down."
        />
      </Section>

      <Section>
        <CardGrid columns={3}>
          {teasers.map((teaser) => (
            <div key={teaser.title} className="bg-paper p-6">
              <ImagePlaceholder label={teaser.image} aspectRatio="3 / 2" />
              <h2 className="mt-4 text-xl">{teaser.title}</h2>
              <p className="mt-2 text-sm text-muted">{teaser.body}</p>
            </div>
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
