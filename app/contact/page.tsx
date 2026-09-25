import { Section } from "@/components/ui/Section";
import { TitleBand } from "@/components/ui/TitleBand";
import { Photo } from "@/components/ui/Photo";
import { WaCTA } from "@/components/ui/WaCTA";
import { siteConfig } from "@/lib/content/site";

const details = [
  { label: "Address", value: siteConfig.address },
  { label: "Hours", value: "Mon–Sat, 9:00–18:00" },
  { label: "Phone", value: siteConfig.phone },
  { label: "Email", value: siteConfig.email },
];

export default function ContactPage() {
  return (
    <main>
      <Section border={false}>
        <TitleBand
          eyebrow="Contact"
          title="Find Us"
          intro="We’re now at Ridgeways, Nairobi. Come visit us at our new home."
        />
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <Photo
            src="/photos/home/contact-storefront.jpg"
            label="IMG-50 · storefront, Ridgeways"
            alt="Ashok Sunny Tailored storefront, Ridgeways, Nairobi"
            aspectRatio="4 / 3"
          />
          <div className="text-center sm:text-left">
            <div className="flex flex-col items-center gap-6 sm:items-start">
              {details.map((detail) => (
                <div key={detail.label}>
                  <p className="text-xs uppercase tracking-wide text-muted">{detail.label}</p>
                  <p className="mt-1 text-sm">{detail.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <WaCTA message="Hi, I'd like to ask about..." label="Message Us on WhatsApp" />
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
