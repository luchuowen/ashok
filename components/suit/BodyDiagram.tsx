/**
 * Front-view figure with the active measurement drawn on it — the visual
 * guide beside each measurement card (Hockerty highlights the body zone
 * being measured; this does the same in the house's line style).
 */
const ZONES: Record<string, React.ReactNode> = {
  neck: <ellipse cx="100" cy="66" rx="13" ry="4" />,
  chest: <ellipse cx="100" cy="112" rx="40" ry="7" />,
  stomach: <ellipse cx="100" cy="160" rx="35" ry="6" />,
  shoulder: <path d="M58 82 Q100 72 142 82" />,
  sleeve: <path d="M143 83 L158 150 L166 214" />,
  bicep: <ellipse cx="151" cy="118" rx="10" ry="4" transform="rotate(-70 151 118)" />,
  wrist: <ellipse cx="166" cy="214" rx="7" ry="3" transform="rotate(-15 166 214)" />,
  jacketLength: <path d="M112 70 L112 222" />,
  trouserWaist: <ellipse cx="100" cy="182" rx="34" ry="5" />,
  hips: <ellipse cx="100" cy="206" rx="39" ry="6" />,
  thigh: <ellipse cx="80" cy="238" rx="17" ry="4" />,
  rise: <path d="M100 184 L100 226" />,
  inseam: <path d="M96 230 L90 410" />,
};

export function BodyDiagram({ zone, className = "" }: { zone?: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 440" className={className} role="img" aria-label={zone ? `Where to measure: ${zone}` : "Body measurement guide"}>
      <g fill="rgb(var(--paper))" stroke="rgb(var(--ink) / 0.55)" strokeWidth="1.2" strokeLinejoin="round">
        {/* head */}
        <ellipse cx="100" cy="36" rx="17" ry="21" />
        {/* torso + arms + legs as one outline */}
        <path d="M88 58 L88 70 Q70 74 58 82 Q48 88 46 110 L36 206 Q34 214 38 218 L44 216 L54 150 L60 118 L62 160 Q60 184 62 206 L66 250 L72 412 L90 414 L96 262 L100 236 L104 262 L110 414 L128 412 L134 250 L138 206 Q140 184 138 160 L140 118 L146 150 L158 216 L164 218 Q168 214 164 206 L154 110 Q152 88 142 82 Q130 74 112 70 L112 58 Z" />
      </g>
      <g fill="none" stroke="rgb(var(--ink) / 0.15)" strokeWidth="0.8">
        <path d="M100 70 L100 184 M70 112 Q100 120 130 112" />
      </g>
      {zone && ZONES[zone] ? (
        <g fill="none" stroke="rgb(var(--oxblood))" strokeWidth="2.6" strokeDasharray="5 3" strokeLinecap="round">
          {ZONES[zone]}
        </g>
      ) : null}
    </svg>
  );
}
