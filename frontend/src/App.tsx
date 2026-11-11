import { useEffect, useState } from "react";
import "./App.css";
import ListingForm from "./ListingForm";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import MyListings from "./MyListings";

type ApiListing = {
  id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  image: string | null;
  shipping_cost: string;
};

type Listing = {
  id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  image: string;
  shippingCost: number;
  icon: string;
  tone: string;
};

type SessionUser = {
  id: number;
  username: string;
  email: string;
};

const categoryLabels: Record<string, string> = {
  postcards: "Cartes postales",
  coins: "Pièces",
  stamps: "Timbres",
  other: "Autres objets",
};

const categoryVisuals: Record<string, { icon: string; tone: string }> = {
  postcards: { icon: "✉️", tone: "rose" },
  coins: { icon: "🪙", tone: "gold" },
  stamps: { icon: "📮", tone: "blue" },
  other: { icon: "📷", tone: "green" },
};

const conditionLabels: Record<string, string> = {
  new: "Neuf",
  very_good: "Très bon état",
  good: "Bon état",
  used: "État d’usage",
};

const categories = ["Tout", ...Object.values(categoryLabels)];

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

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

    const params = new URLSearchParams();

    const selectedCategory = Object.entries(categoryLabels).find(
      ([, label]) => label === category,
    )?.[0];

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const query = params.toString();
    const url = query ? `/api/listings/?${query}` : "/api/listings/";

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
          const key = item.category.toLowerCase();

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            category: categoryLabels[key] ?? item.category,
            condition:
              conditionLabels[item.condition.toLowerCase()] ?? item.condition,
            price: Number(item.price),
            image: item.image ?? "",
            shippingCost: Number(item.shipping_cost),
            ...(categoryVisuals[key] ?? { icon: "📦", tone: "green" }),
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

    fetch("/api/auth/me/", { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) return null;

        if (!response.ok) {
          throw new Error("Impossible de vérifier la session.");
        }

        return (await response.json()) as { user: SessionUser };
      })
      .then((data) => {
        if (!cancelled && data?.user) {
          setSessionUser(data.user);
        }
      })
      .catch(() => {
        // Le catalogue reste accessible si la session ne peut pas être vérifiée.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedListing) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedListing(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedListing]);

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

  async function handleLogout() {
    try {
      const csrfResponse = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        throw new Error("Impossible de préparer la déconnexion.");
      }

      const csrfToken = getCookie("csrftoken");

      if (!csrfToken) {
        throw new Error("Le jeton de sécurité est introuvable.");
      }

      const response = await fetch("/api/auth/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error("La déconnexion a échoué. Réessaie.");
      }

      setSessionUser(null);
      setShowMyListings(false);
      setRegistrationMessage("Vous êtes déconnectée.");
    } catch (logoutError) {
      setRegistrationMessage(
        logoutError instanceof Error
          ? logoutError.message
          : "La déconnexion a échoué.",
      );
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Collector, accueil">
          <span className="brand-mark">C</span>
          <span>
            collector<span className="brand-dot">.</span>
          </span>
        </a>

        <nav className="navigation">
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

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">LA COLLECTION A UNE HISTOIRE</span>

          <h1>
            Les objets rares
            <br />
            trouvent leur place.
          </h1>

          <p>
            Découvrez des pièces uniques proposées par des collectionneurs
            passionnés.
          </p>

          <a className="hero-link" href="#catalogue">
            Explorer le catalogue <span>→</span>
          </a>
        </div>

        <div className="hero-art" aria-hidden="true">
          <span className="hero-stamp">✉️</span>
          <span className="hero-coin">✦</span>
          <span className="hero-caption">
            Trouvailles choisies
            <br />
            avec passion
          </span>
        </div>
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

        <div className="filters" aria-label="Filtrer par catégorie">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
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
                    <span className="item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
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

      {registrationMessage && (
        <p className="registration-message" role="status">
          {registrationMessage}
        </p>
      )}

      {showListingForm && (
        <ListingForm
          onClose={() => setShowListingForm(false)}
          onSubmitted={() => {
            setShowListingForm(false);
            setRegistrationMessage(
              "Annonce envoyée. Elle sera visible après modération.",
            );
          }}
        />
      )}

      {showMyListings && (
        <MyListings onClose={() => setShowMyListings(false)} />
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
        <div
          className="modal-backdrop"
          onClick={() => setSelectedListing(null)}
        >
          <section
            className="listing-modal listing-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
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
                <span className="item-icon" aria-hidden="true">
                  {selectedListing.icon}
                </span>
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
          </section>
        </div>
      )}
    </main>
  );
}

export default App;