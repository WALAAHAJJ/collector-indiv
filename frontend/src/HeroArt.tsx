import ObjectArt from "./ObjectArt";

/**
 * Collage de trois polaroïds sous la bannière d'accueil.
 * Purement décoratif : masqué aux lecteurs d'écran.
 */
export default function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <figure className="polaroid polaroid-stamps">
        <div className="polaroid-photo sage">
          <ObjectArt kind="stamps" size={96} />
        </div>
        <figcaption>timbres</figcaption>
      </figure>

      <figure className="polaroid polaroid-coins">
        <div className="polaroid-photo rose">
          <ObjectArt kind="coins" size={98} />
        </div>
        <figcaption>2 francs</figcaption>
      </figure>

      <figure className="polaroid polaroid-postcards">
        <div className="polaroid-photo gold">
          <ObjectArt kind="postcards" size={108} />
        </div>
        <figcaption>cartes de Paris</figcaption>
      </figure>

      <p className="hero-note">
        Trouvailles choisies avec passion
        <svg viewBox="0 0 60 50" width="60" height="50">
          <path
            d="M4 8 C20 6 38 14 46 40 M46 40 L36 34 M46 40 L50 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </p>
    </div>
  );
}
