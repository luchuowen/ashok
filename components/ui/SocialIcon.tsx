/**
 * Minimal single-stroke outline glyphs, drawn to match the site's hairline
 * (border-line) aesthetic rather than pasted-in brand logos — same
 * currentColor / stroke-weight family across all five so the row reads as
 * one system. SocialLinks renders these white-on-ink inside a rounded tile
 * per Owen's request, echoing the familiar black-badge social-icon look.
 */
type IconProps = { className?: string };

export function WhatsAppIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7 20l1.15-3.55A7.45 7.45 0 1 1 12 19.45c-1.24 0-2.4-.32-3.4-.88L7 20Z"
        strokeLinejoin="round"
      />
      <path
        d="M9.35 9.55c.2-.45.4-.45.6-.45h.35c.1 0 .3 0 .45.35.2.4.6 1.3.65 1.4.05.1.1.3 0 .45l-.3.4c-.1.15-.2.25-.1.4.2.3.6.8 1.1 1.2.6.5.9.7 1.1.8.2.1.3.1.4-.05l.4-.5c.1-.15.2-.15.35-.1l1 .5c.15.05.25.1.3.2.05.15 0 .9-.3 1.2s-.8.5-1.2.5c-.4 0-.9-.1-1.5-.35-1.8-.8-2.9-2.45-3-2.65-.1-.15-.7-.9-.7-1.75s.4-1.2.5-1.35Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InstagramIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <path
        d="M13.6 20v-6.4h2.1l.3-2.5h-2.4V9.5c0-.7.25-1.2 1.2-1.2h1.3V6.1c-.25-.03-1.05-.1-1.9-.1-1.9 0-3.2 1.15-3.2 3.3v1.7H9v2.5h1.9V20"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TikTokIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M13.5 4v9.75a2.95 2.95 0 1 1-2.1-2.82"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 4a4.25 4.25 0 0 0 4.2 4.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function YouTubeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <path d="M10.3 8.7v6.6l5.4-3.3-5.4-3.3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MessageIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3.5v-3.5H6.5a2 2 0 0 1-2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
