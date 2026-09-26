import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { Photo } from "@/components/ui/Photo";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Journal", "Notes from the workroom: cloth, cut and caring for your tailoring, from Ashok Sunny Tailored in Nairobi.", "/journal", { noindex: true });

const teasers = [
  {
    title: "Caring for hand-canvassed wool",
    body: "Why you shouldn't dry-clean it every week.",
    image: "IMG-60 · wool care",
    src: "/photos/fabrics/charcoal-wool.jpg",
  },
  {
    title: "What 'canvas' actually means",
    body: "A short explainer on construction, in plain language.",
    image: "IMG-61 · canvas construction",
    src: "/photos/home/canvas-basting.jpg",
  },
  {
    title: "Dressing for a Nairobi wedding season",
    body: "Fabric weight notes for the calendar here, specifically.",
    image: "IMG-62 · wedding season style",
    src: "/photos/portfolio/ivory-dinner-jacket.jpg",
  },
];

export default function JournalPage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Journal"
          title="Notes from the workshop."
          intro="Fabric care, style guides and notes from the cutting table."
        />
      </Section>

      <Section>
        <CardGrid columns={3} className="text-center sm:text-left">
          {teasers.map((teaser) => (
            <div key={teaser.title} className="bg-paper p-6">
              <Photo src={teaser.src} label={teaser.image} alt={teaser.title} aspectRatio="3 / 2" />
              <h2 className="mt-4 text-xl">{teaser.title}</h2>
              <p className="mt-2 text-sm text-muted">{teaser.body}</p>
            </div>
          ))}
        </CardGrid>
      </Section>
    </main>
  );
}
