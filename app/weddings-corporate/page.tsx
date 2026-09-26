import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { CardGrid } from "@/components/ui/CardGrid";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Weddings & Corporate", "Suits for grooms and groomsmen, and tailored uniforms for teams in Nairobi — group measuring, fittings and delivery handled for you.", "/weddings-corporate");

const paths = [
  {
    title: "Wedding parties",
    body: "Groom, groomsmen, father of the bride — matched or coordinated fabric, fittings scheduled together, one delivery date.",
    href: "/booking?type=wedding",
    linkLabel: "Enquire for your wedding →",
  },
  {
    title: "Corporate & office wear",
    body: "Uniform blazers or consistent officewear for a team, with volume pricing and a single billing contact.",
    href: "/booking?type=corporate",
    linkLabel: "Enquire for your office →",
  },
];

const groupSteps = [
  {
    number: "01",
    title: "Group enquiry",
    body: "One form, one contact — we don't chase five separate consultations.",
  },
  {
    number: "02",
    title: "Coordinated fittings",
    body: "Scheduled together at Ridgeways, or on-site for larger corporate groups.",
  },
  {
    number: "03",
    title: "One invoice",
    body: "Volume pricing, single payment reference, tracked in the portal.",
  },
];

export default function WeddingsCorporatePage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="New — Group Tailoring"
          title="For the wedding party, or the whole office."
          intro="Group tailoring with one point of contact — coordinated fittings, one invoice, matched fabric across the group."
        />
        <h2 className="mt-12 text-center text-3xl sm:text-left">Two paths</h2>
        <CardGrid columns={2} className="mt-8">
          {paths.map((path) => (
            <div key={path.title} className="bg-paper p-6 text-center sm:text-left">
              <h3 className="text-xl">{path.title}</h3>
              <p className="mt-3 text-sm text-muted">{path.body}</p>
              <Link href={path.href} className="mt-4 inline-block text-sm text-oxblood hover:underline">
                {path.linkLabel}
              </Link>
            </div>
          ))}
        </CardGrid>
      </Section>

      <Section className="text-center sm:text-left">
        <h2 className="text-3xl">How group bookings work</h2>
        <ol className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {groupSteps.map((step) => (
            <li key={step.number}>
              <p className="font-display text-2xl text-oxblood">{step.number}</p>
              <p className="mt-2 text-base">{step.title}</p>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
