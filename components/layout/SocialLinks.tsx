import { WhatsAppConnect } from "@/components/ui/WhatsAppConnect";
import { InstagramIcon, FacebookIcon, TikTokIcon } from "@/components/ui/SocialIcon";

// Placeholder hrefs ("#") until the actual profiles exist — swap these in
// once the accounts are live. WhatsApp is the one channel that's real today,
// so it's the only one that actually opens anything.
const PLACEHOLDER_SOCIALS = [
  { label: "Instagram", href: "#", Icon: InstagramIcon },
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "TikTok", href: "#", Icon: TikTokIcon },
];

const DARK_ICON_BUTTON =
  "flex h-9 w-9 items-center justify-center border border-cream/25 text-cream transition-colors hover:border-oxblood hover:text-oxblood";

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <WhatsAppConnect variant="icon" triggerClassName={DARK_ICON_BUTTON} />
      {PLACEHOLDER_SOCIALS.map(({ label, href, Icon }) => (
        <a key={label} href={href} aria-label={label} className={DARK_ICON_BUTTON}>
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
