import { WhatsAppConnect } from "@/components/ui/WhatsAppConnect";
import { FacebookIcon, InstagramIcon } from "@/components/ui/SocialIcon";

// The house's live profiles. Add TikTok / YouTube here (icons exist in SocialIcon) once
// official channels are confirmed — never ship a "#" link.
const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/Ashoksunnytailored/", Icon: FacebookIcon },
  { label: "Instagram", href: "https://www.instagram.com/ashok_sunny_/", Icon: InstagramIcon },
];

// White glyph on an ink rounded-square tile — the familiar black social-icon
// badge look, per Owen's request — used the same way regardless of the
// surrounding page's own background, so "tone" no longer needs to swap
// colors; it's kept only so existing call sites don't need to change.
const ICON_BUTTON_BY_TONE = {
  dark: "flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-cream transition-colors hover:bg-oxblood",
  light: "flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-cream transition-colors hover:bg-oxblood",
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
    <div className={`flex items-center gap-2 ${className}`}>
      <WhatsAppConnect variant="icon" triggerClassName={iconButton} iconClassName={ICON_SIZE} />
      {SOCIALS.map(({ label, href, Icon }) => (
        <a key={label} href={href} aria-label={`${label} (opens in a new tab)`} target="_blank" rel="noopener noreferrer" className={iconButton}>
          <Icon className={ICON_SIZE} />
        </a>
      ))}
    </div>
  );
}
