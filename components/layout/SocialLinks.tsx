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

const ICON_BUTTON_BY_TONE = {
  dark: "flex h-9 w-9 items-center justify-center text-cream transition-colors hover:text-ember",
  light: "flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-oxblood",
} as const;
const ICON_SIZE = "h-5 w-5";

export function SocialLinks({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: keyof typeof ICON_BUTTON_BY_TONE;
}) {
  const iconButton = ICON_BUTTON_BY_TONE[tone];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <WhatsAppConnect variant="icon" triggerClassName={iconButton} iconClassName={ICON_SIZE} />
      {PLACEHOLDER_SOCIALS.map(({ label, href, Icon }) => (
        <a key={label} href={href} aria-label={label} className={iconButton}>
          <Icon className={ICON_SIZE} />
        </a>
      ))}
    </div>
  );
}
