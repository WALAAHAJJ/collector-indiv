export type ArtKind = "stamps" | "coins" | "postcards" | "other";

type ObjectArtProps = Readonly<{
  kind: ArtKind;
  size?: number;
  title?: string;
}>;

const INK = "#2b2118";
const PAPER = "#fffdf8";
const GREEN = "#1f4a3e";
const TOMATO = "#c23a22";
const MUSTARD = "#e9c46a";
const PINK = "#e8b4a6";
const SAGE = "#8db09c";

/**
 * Illustrations d'objets de collection dessinées en SVG : timbre, pièce,
 * cartes postales et cassette. Sans `title`, le dessin est décoratif et
 * masqué aux lecteurs d'écran.
 */
export default function ObjectArt({ kind, size = 140, title }: ObjectArtProps) {
  const shared = {
    className: "object-art",
    "data-art": kind,
    style: { height: size, width: "auto" },
    role: title ? "img" : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
  } as const;

  switch (kind) {
    case "stamps":
      return (
        <svg viewBox="0 0 120 150" {...shared}>
          <rect x="6" y="6" width="108" height="138" fill={PAPER} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <rect x="6" y="6" width="108" height="138" fill="none" stroke={SAGE} strokeWidth="9" strokeDasharray="0.1 11" strokeLinecap="round" />
          <rect x="22" y="22" width="76" height="92" fill={MUSTARD} stroke={INK} strokeWidth="3" />
          <circle cx="60" cy="58" r="15" fill={TOMATO} stroke={INK} strokeWidth="3" />
          <path d="M22 114 L48 80 L66 100 L80 84 L98 114 Z" fill={GREEN} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
    case "coins":
      return (
        <svg viewBox="0 0 150 150" {...shared}>
          <circle cx="75" cy="75" r="68" fill={PAPER} stroke={INK} strokeWidth="4" />
          <circle cx="75" cy="75" r="55" fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />
          <circle cx="75" cy="75" r="44" fill={GREEN} stroke={INK} strokeWidth="3" />
          <text x="75" y="93" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontWeight="700" fontSize="56" fill={PAPER}>2</text>
        </svg>
      );
    case "postcards":
      return (
        <svg viewBox="0 0 170 120" {...shared}>
          <g transform="rotate(8 85 60)">
            <rect x="14" y="14" width="140" height="92" fill={PINK} stroke={INK} strokeWidth="4" />
          </g>
          <rect x="14" y="14" width="140" height="92" fill={PAPER} stroke={INK} strokeWidth="4" />
          <path d="M90 24 L90 96" stroke={INK} strokeWidth="2.5" />
          <path d="M44 98 L55 56 L60 28 L65 56 L76 98 M50 76 L70 76 M54 60 L66 60" fill="none" stroke={GREEN} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="112" y="24" width="30" height="36" fill={TOMATO} stroke={INK} strokeWidth="2.5" />
          <path d="M100 74 L144 74 M100 84 L144 84 M100 94 L130 94" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 380 250" {...shared}>
          <rect x="8" y="8" width="364" height="234" rx="18" fill={TOMATO} stroke={INK} strokeWidth="6" />
          <rect x="40" y="28" width="300" height="118" rx="10" fill={PAPER} stroke={INK} strokeWidth="5" />
          <rect x="56" y="42" width="268" height="28" fill={MUSTARD} stroke={INK} strokeWidth="3" />
          <rect x="100" y="84" width="180" height="48" rx="24" fill={INK} />
          <circle cx="140" cy="108" r="18" fill={PAPER} />
          <circle cx="240" cy="108" r="18" fill={PAPER} />
          <circle cx="140" cy="108" r="6" fill={INK} />
          <circle cx="240" cy="108" r="6" fill={INK} />
          <path d="M70 242 L100 190 L280 190 L310 242 Z" fill={MUSTARD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="150" cy="216" r="7" fill={INK} />
          <circle cx="230" cy="216" r="7" fill={INK} />
        </svg>
      );
  }
}
