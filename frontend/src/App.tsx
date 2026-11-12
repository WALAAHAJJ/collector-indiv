import { useEffect, useState } from "react";
import "./App.css";
import "./styles/layout.css";
import "./styles/tones.css";
import "./styles/header.css";
import "./styles/hero.css";
import "./styles/catalogue.css";
import "./styles/cards.css";
import "./styles/modal.css";
import "./styles/forms.css";
import ListingForm from "./ListingForm";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import MyListings from "./MyListings";
import { clearToken, getToken } from "./auth";
import { catalogUrl } from "./api";
import Modal from "./Modal";
import HeroArt from "./HeroArt";
import ObjectArt, { type ArtKind } from "./ObjectArt";

type ApiListing = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  condition: string;
  price: number;
  shippingCost: number;
};

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  image: string;
  shippingCost: number;
  art: ArtKind;
  tone: string;
};

type SessionUser = {
  id: string;
  username: string;
  email: string;
};

const categoryLabels: Record<string, string> = {
  postcards: "Cartes postales",
  coins: "Pièces",
  stamps: "Timbres",
  other: "Autres objets",
};

const categoryVisuals: Record<string, { art: ArtKind; tone: string }> = {
  postcards: { art: "postcards", tone: "gold" },
  coins: { art: "coins", tone: "rose" },
  stamps: { art: "stamps", tone: "sage" },
  other: { art: "other", tone: "kraft" },
};

const conditionLabels: Record<string, string> = {
  new: "Neuf",
  very_good: "Très bon état",
  good: "Bon état",
  used: "État d’usage",
};

const categories = ["Tout", ...Object.values(categoryLabels)];

function formatEuros(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [category, setCategory] = useState("Tout");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [showMyListings, setShowMyListings] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const url = catalogUrl(
      categories.includes(category) && category !== "Tout" ? category : "",
      search.trim(),
    );

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Impossible de charger les annonces.");
        }

        return (await response.json()) as ApiListing[];
      })
      .then((data) => {
        if (cancelled) return;

        const convertedListings = data.map((item) => {
          const key =
            Object.entries(categoryLabels).find(
              ([, label]) => label === item.category,
            )?.[0] ?? "other";

          return {
            id: item.id,
            title: item.name,
            description: item.description ?? "",
            category: item.category,
            condition:
              conditionLabels[item.condition.toLowerCase()] ?? item.condition,
            price: item.price,
            image: "",
            shippingCost: item.shippingCost,
            ...(categoryVisuals[key] ?? categoryVisuals.other),
          };
        });

        setListings(convertedListings);
        setError("");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Le catalogue est momentanément indisponible.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [category, search]);

  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    if (!token) return;

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          clearToken();
          return null;
        }

        if (!response.ok) {
          throw new Error("Impossible de vérifier la session.");
        }

        return (await response.json()) as SessionUser;
      })
      .then((user) => {
        if (!cancelled && user) {
          setSessionUser(user);
        }
      })
      .catch(() => {
        // Le catalogue reste accessible si la session ne peut pas être vérifiée.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredListings = listings.filter((item) => {
    const matchesCategory = category === "Tout" || item.category === category;
    const matchesSearch = item.title
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  function handleSearchChange(value: string) {
    if (value !== search) {
      setLoading(true);
    }

    setError("");
    setSearch(value);
  }

  function handleCategoryChange(value: string) {
    if (value !== category) {
      setLoading(true);
    }

    setError("");
    setCategory(value);
  }

  function handleLogout() {
    clearToken();
    setSessionUser(null);
    setShowMyListings(false);
    setRegistrationMessage("Vous êtes déconnectée.");
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Collector, accueil">
          <span className="brand-word">
            collector<span className="brand-dot">.</span>
          </span>
          <svg
            className="brand-underline"
            viewBox="0 0 160 10"
            aria-hidden="true"
          >
            <path
              d="M2 6 C20 1 34 9 54 5 C74 1 90 9 110 5 C128 2 144 8 158 4"
              fill="none"
              stroke="#e9c46a"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </a>

        <nav className="navigation" aria-label="Navigation principale">
          <a className="active" href="#catalogue">
            Catalogue
          </a>
        </nav>

        <div className="account-actions">
          {sessionUser ? (
            <>
              <span className="account-greeting">
                Bonjour, {sessionUser.username}
              </span>

              <button
                type="button"
                className="login-button"
                onClick={handleLogout}
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="login-button"
                onClick={() => setShowLogin(true)}
              >
                Se connecter
              </button>

              <button
                type="button"
                className="sell-button"
                onClick={() => setShowRegistration(true)}
              >
                Créer un compte
              </button>
            </>
          )}
        </div>
      </header>

      {registrationMessage && (
        <output className="registration-message">
          {registrationMessage}
        </output>
      )}

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">LA COLLECTION A UNE HISTOIRE</span>

          <h1>
            Les objets <em className="marker">rares</em> trouvent leur place.
          </h1>

          <p>
            Découvrez des pièces uniques proposées par des collectionneurs
            passionnés.
          </p>

          <a className="hero-link" href="#catalogue">
            Explorer le catalogue <span>→</span>
          </a>
        </div>

        <HeroArt />
      </section>

      {sessionUser && (
        <section className="seller-actions" aria-label="Actions vendeur">
          <button
            type="button"
            className="my-listings-button"
            onClick={() => setShowMyListings(true)}
          >
            Mes annonces
          </button>

          <button
            type="button"
            className="sell-button"
            onClick={() => setShowListingForm(true)}
          >
            ＋ Déposer une annonce
          </button>
        </section>
      )}

      <section className="catalogue" id="catalogue">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LE CATALOGUE</span>
            <h2>À découvrir</h2>
          </div>

          <label className="search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Rechercher un objet"
              aria-label="Rechercher un objet"
            />
          </label>
        </div>

        <div className="filters" role="group" aria-label="Filtrer par catégorie">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={category === item}
              className={category === item ? "filter selected" : "filter"}
              onClick={() => handleCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty-state">Chargement du catalogue…</p>
        ) : error ? (
          <p className="empty-state">{error}</p>
        ) : filteredListings.length > 0 ? (
          <div className="listing-grid">
            {filteredListings.map((item) => (
              <article className="listing-card" key={item.id}>
                <div className={`item-visual ${item.tone}`}>
                  {item.image ? (
                    <img
                      className="listing-photo"
                      src={item.image}
                      alt={item.title}
                    />
                  ) : (
                    <ObjectArt kind={item.art} />
                  )}

                  <button
                    type="button"
                    className="favorite"
                    aria-label={`Ajouter ${item.title} aux favoris`}
                  >
                    ♡
                  </button>
                </div>

                <div className="item-details">
                  <span className="item-category">{item.category}</span>
                  <h3>{item.title}</h3>

                  <div className="item-bottom">
                    <span className="condition">{item.condition}</span>
                    <strong>{formatEuros(item.price)}</strong>
                  </div>

                  <p className="shipping-cost">
                    Expédition : {formatEuros(item.shippingCost)}
                  </p>

                  <button
                    type="button"
                    className="details-button"
                    onClick={() => setSelectedListing(item)}
                  >
                    Voir le détail <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {listings.length === 0
              ? "Aucune annonce approuvée pour le moment."
              : "Aucun objet ne correspond à cette recherche."}
          </p>
        )}
      </section>

      <footer>
        <span>
          collector<span className="brand-dot">.</span>
        </span>
        <span>Les belles collections se partagent.</span>
      </footer>

      {showListingForm && sessionUser && (
        <ListingForm
          ownerId={sessionUser.id}
          onClose={() => setShowListingForm(false)}
          onSubmitted={() => {
            setShowListingForm(false);
            setRegistrationMessage(
              "Annonce enregistrée. Elle apparaît dans le catalogue une fois approuvée.",
            );
          }}
        />
      )}

      {showMyListings && sessionUser && (
        <MyListings
          ownerId={sessionUser.id}
          onClose={() => setShowMyListings(false)}
        />
      )}

      {showRegistration && (
        <RegisterForm
          onClose={() => setShowRegistration(false)}
          onRegistered={() => {
            setShowRegistration(false);
            setShowLogin(true);
            setRegistrationMessage(
              "Compte créé. Connectez-vous pour continuer.",
            );
          }}
        />
      )}

      {showLogin && (
        <LoginForm
          onClose={() => setShowLogin(false)}
          onShowRegistration={() => {
            setShowLogin(false);
            setShowRegistration(true);
          }}
          onLoggedIn={(user) => {
            setSessionUser(user);
            setShowLogin(false);
            setRegistrationMessage(`Bienvenue, ${user.username} !`);
          }}
        />
      )}

      {selectedListing && (
        <Modal
          onClose={() => setSelectedListing(null)}
          titleId="modal-title"
          backdropClassName="modal-backdrop"
          dialogClassName="listing-modal listing-detail-modal"
        >
          <button
            type="button"
            className="modal-close"
            onClick={() => setSelectedListing(null)}
            aria-label="Fermer"
          >
            ×
          </button>

          <div
            className={`modal-visual item-visual ${selectedListing.tone}`}
          >
            {selectedListing.image ? (
              <img
                className="listing-photo"
                src={selectedListing.image}
                alt={selectedListing.title}
              />
            ) : (
              <ObjectArt kind={selectedListing.art} size={220} />
            )}
          </div>

          <span className="item-category">{selectedListing.category}</span>
          <h2 id="modal-title">{selectedListing.title}</h2>
          <p>
            {selectedListing.description ||
              "Aucune description renseignée."}
          </p>

          <div className="modal-price">
            <span>{selectedListing.condition}</span>
            <strong>{formatEuros(selectedListing.price)}</strong>
          </div>

          <p className="shipping-cost">
            Frais d’expédition : {formatEuros(selectedListing.shippingCost)}
          </p>
        </Modal>
      )}
    </main>
  );
}

export default App;