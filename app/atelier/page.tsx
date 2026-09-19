import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { Photo } from "@/components/ui/Photo";

const masterTailorImage = "/photos/atelier/master-tailor-cutting-table.jpg";

const beliefs = [
  {
    title: "Your own pattern",
    body: "Not a house block nudged smaller or larger — a pattern cut for you, kept on file for the next order.",
  },
  {
    title: "The fitting is the order",
    body: "Nothing is final until you've stood in it — bespoke here means at least two visits, not one.",
  },
  {
    title: "Told straight",
    body: "Timelines, prices and what a fabric will actually do — said plainly, before you commit to anything.",
  },
];

export default function AtelierPage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="About the House"
          title="A house that moved, and kept its hands."
          intro="Ashok Sunny Tailored is now at Ridgeways, Nairobi — a move made for more light on the cutting table, not a change in who's holding the shears."
        />
      </Section>

      <Section className="bg-paper text-center sm:text-left">
        <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
          <Photo src={masterTailorImage} label="IMG-40 · master tailor at the cutting table" aspectRatio="4 / 3" />
          <p className="text-base text-muted">
            Ashok Sunny built his name over years of work before the move to Ridgeways — the same
            hands, the same block-free approach to a suit, now with a workshop built for it.
          </p>
        </div>
      </Section>

      <Section className="text-center sm:text-left">
        <h2 className="text-3xl">The relocation</h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          The house has moved from its previous location to Ridgeways. If you&apos;ve visited us
          before, this is the only thing that&apos;s changed — same phone number, same craft, new
          address.
        </p>
      </Section>

      <Section className="text-center sm:text-left">
        <h2 className="text-3xl">What we believe about fit</h2>
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
