import { useEffect, useState, useSyncExternalStore } from "react";
import "./styles/layout.css";
import "./styles/tones.css";
import "./styles/header.css";
import "./styles/hero.css";
import "./styles/catalogue.css";
import "./styles/cards.css";
import "./styles/modal.css";
import "./styles/forms.css";
import "./styles/my-listings.css";
import "./styles/admin.css";
import "./styles/orders.css";
import "./styles/footer.css";
import ListingForm from "./ListingForm";
import MyListings from "./MyListings";
import MyOrders from "./MyOrders";
import { getToken, subscribe, userFromToken } from "./auth";
import NotificationBell from "./NotificationBell";
import { login, logout, register } from "./identity";
import { catalogUrl } from "./api";
import ListingPage from "./ListingPage";
import { toCatalogListing, type ApiListing, type CatalogListing, type Listing } from "./listing";
import { formatEuros } from "./money";
import { listingHref, useRoute } from "./route";
import PurchaseDialog from "./PurchaseDialog";
import AdminPanel from "./AdminPanel";
import HeroArt from "./HeroArt";
import ObjectArt from "./ObjectArt";
import { visualForLabel } from "./categories";
import { useCategories } from "./useCategories";

function App() {
  const { categories: apiCategories, reload: reloadCategories } =
    useCategories();
  const categories = ["Tout", ...apiCategories.map((item) => item.name)];
  const [listings, setListings] = useState<CatalogListing[]>([]);
  const [category, setCategory] = useState("Tout");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const route = useRoute();
  const [showListingForm, setShowListingForm] = useState(false);
  const [showMyListings, setShowMyListings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<Listing | null>(null);
  // Incrémenté après un achat pour recharger le catalogue : l'objet vendu doit en disparaître.
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [registrationMessage, setRegistrationMessage] = useState("");
  // L'identité vient du jeton de Keycloak : elle apparaît dès que la connexion est établie.
  const sessionUser = userFromToken(useSyncExternalStore(subscribe, getToken));

  useEffect(() => {
    let cancelled = false;

    const url = catalogUrl(category === "Tout" ? "" : category, search.trim());

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Impossible de charger les annonces.");
        }

        return (await response.json()) as ApiListing[];
      })
      .then((data) => {
        if (cancelled) return;

        const convertedListings = data.map(toCatalogListing);

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
  }, [category, search, catalogVersion]);

  const filteredListings = listings
    .map((item) => ({
      ...item,
      ...visualForLabel(item.category, apiCategories),
    }))
    .filter((item) => {
      const matchesCategory =
        category === "Tout" || item.category === category;
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
    setShowMyListings(false);
    setShowMyOrders(false);
    setShowAdmin(false);
    void logout();
  }

  /** Bouton d'achat du détail : connexion pour un visiteur, rien à acheter pour le vendeur lui-même. */
  function renderBuyAction(listing: Listing) {
    if (!sessionUser) {
      return (
        <button
          type="button"
          className="sell-button buy-button"
          onClick={() => void login()}
        >
          Se connecter pour acheter
        </button>
      );
    }

    if (sessionUser.id === listing.ownerId) {
      return <p className="purchase-note">C’est votre annonce.</p>;
    }

    return (
      <button
        type="button"
        className="sell-button buy-button"
        onClick={() => setPurchaseTarget(listing)}
      >
        Acheter
      </button>
    );
  }

  function renderCatalogue() {
    if (loading) {
      return <p className="empty-state">Chargement du catalogue…</p>;
    }

    if (error) {
      return <p className="empty-state">{error}</p>;
    }

    if (filteredListings.length === 0) {
      return (
        <p className="empty-state">
          {listings.length === 0
            ? "Aucune annonce approuvée pour le moment."
            : "Aucun objet ne correspond à cette recherche."}
        </p>
      );
    }

    return (
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

            <a className="details-button" href={listingHref(item.id)}>
              Voir le détail <span>→</span>
            </a>
          </div>
        </article>
      ))}
    </div>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Collector, accueil">
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

              <NotificationBell />

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
                onClick={() => void login()}
              >
                Se connecter
              </button>

              <button
                type="button"
                className="sell-button"
                onClick={() => void register()}
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

      {route.name === "home" && (
        <>
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
        </>
      )}

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
            className="my-listings-button"
            onClick={() => setShowMyOrders(true)}
          >
            Mes commandes
          </button>

          <button
            type="button"
            className="sell-button"
            onClick={() => setShowListingForm(true)}
          >
            ＋ Déposer une annonce
          </button>

          {sessionUser.role === "ADMIN" && (
            <button
              type="button"
              className="my-listings-button"
              onClick={() => setShowAdmin(true)}
            >
              Administration
            </button>
          )}
        </section>
      )}

      {route.name === "home" ? (
        <>
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

          <fieldset className="filters" aria-label="Filtrer par catégorie">
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
          </fieldset>

          {renderCatalogue()}
        </section>
        </>
      ) : (
        <ListingPage
          id={route.id}
          categories={apiCategories}
          refreshKey={catalogVersion}
          renderBuyAction={renderBuyAction}
        />
      )}

      <footer>
        <span>
          collector<span className="brand-dot">.</span>
        </span>
        <span>Les belles collections se partagent.</span>
      </footer>

      {showListingForm && sessionUser && (
        <ListingForm
          ownerId={sessionUser.id}
          categories={apiCategories}
          onClose={() => setShowListingForm(false)}
          onSubmitted={(message) => {
            setShowListingForm(false);
            setRegistrationMessage(
              message ??
                "Annonce enregistrée. Elle apparaît dans le catalogue une fois approuvée.",
            );
          }}
        />
      )}

      {showAdmin && sessionUser?.role === "ADMIN" && (
        <AdminPanel
          categories={apiCategories}
          onCategoriesChange={reloadCategories}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {showMyListings && sessionUser && (
        <MyListings
          ownerId={sessionUser.id}
          categories={apiCategories}
          onClose={() => setShowMyListings(false)}
        />
      )}

      {showMyOrders && sessionUser && (
        <MyOrders onClose={() => setShowMyOrders(false)} />
      )}

      {purchaseTarget && (
        <PurchaseDialog
          listing={purchaseTarget}
          onClose={() => setPurchaseTarget(null)}
          onPurchased={(order) => {
            setPurchaseTarget(null);
            setCatalogVersion((version) => version + 1);
            setRegistrationMessage(
              `Achat confirmé : « ${order.listingName} », ${formatEuros(order.buyerTotal)} payés.`,
            );
          }}
        />
      )}
    </main>
  );
}

export default App;