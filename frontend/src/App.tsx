import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import IdleWarning from "./IdleWarning";
import SellerPage from "./SellerPage";
import { useIdleLogout } from "./useIdleLogout";
import "./styles/layout.css";
import "./styles/tones.css";
import "./styles/header.css";
import "./styles/hero.css";
import "./styles/catalogue.css";
import "./styles/catalogue-controls.css";
import "./styles/cards.css";
import "./styles/modal.css";
import "./styles/forms.css";
import "./styles/my-listings.css";
import "./styles/admin.css";
import "./styles/orders.css";
import "./styles/footer.css";
import "./styles/info-page.css";
import ListingForm from "./ListingForm";
import MyListings from "./MyListings";
import MyOrders from "./MyOrders";
import { getToken, subscribe, userFromToken } from "./auth";
import NotificationBell from "./NotificationBell";
import { login, logout, register } from "./identity";
import { catalogUrl } from "./api";
import InfoPage from "./InfoPage";
import SiteFooter from "./SiteFooter";
import ListingPage from "./ListingPage";
import { toCatalogListing, type ApiListing, type CatalogListing, type Listing } from "./listing";
import { formatEuros } from "./money";
import { LANGUAGES, setLanguage, useLanguage } from "./i18n";
import { infoHref, listingHref, useRoute } from "./route";

import PurchaseDialog from "./PurchaseDialog";
import AdminPanel from "./AdminPanel";
import ObjectArt from "./ObjectArt";
import { visualForLabel } from "./categories";
import {
  NO_FILTERS,
  type CatalogFilters,
  applyFilters,
  hasActiveFilters,
  pageCount,
  paginate,
  sortListings,
} from "./catalogue";

/** « Bonnes affaires » : les annonces à 20 € ou moins, les moins chères d'abord. */
const BARGAIN_FILTERS: CatalogFilters = { ...NO_FILTERS, maxPrice: "20", sort: "price-asc" };

/** Petites icônes des deux premiers onglets (les autres utilisent les illustrations des catégories). */
function TabGlyph({ kind }: Readonly<{ kind: "grid" | "tag" }>) {
  return (
    <svg viewBox="0 0 34 34" width="46" height="46" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      {kind === "grid" ? (
        <>
          <rect x="5" y="5" width="10" height="10" rx="2" />
          <rect x="19" y="5" width="10" height="10" rx="2" />
          <rect x="5" y="19" width="10" height="10" rx="2" />
          <rect x="19" y="19" width="10" height="10" rx="2" />
        </>
      ) : (
        <>
          <path d="M5 17 17 5h12v12L17 29 5 17Z" />
          <circle cx="23" cy="11" r="1.8" />
        </>
      )}
    </svg>
  );
}
import { CatalogueControls } from "./CatalogueControls";
import { Pagination } from "./Pagination";
import { VISITOR_KEY, useFavorites } from "./favorites";
import { useCategories } from "./useCategories";

function App() {
  const { categories: apiCategories, reload: reloadCategories } =
    useCategories();
  const [listings, setListings] = useState<CatalogListing[]>([]);
  const [category, setCategory] = useState("Tout");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CatalogFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const route = useRoute();
  const { language, t } = useLanguage();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
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
  const favorites = useFavorites(sessionUser?.id ?? VISITOR_KEY);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Les menus déroulants (compte, catégories, langue) se ferment avec Échap ou un clic en dehors.
  const anyMenuOpen = accountMenuOpen || languageMenuOpen;
  useEffect(() => {
    if (!anyMenuOpen) {
      return;
    }

    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") {
        return;
      }
      if (event instanceof MouseEvent) {
        const target = event.target as Node;
        if (
          accountMenuRef.current?.contains(target) ||
          languageMenuRef.current?.contains(target)
        ) {
          return;
        }
      }
      setAccountMenuOpen(false);
      setLanguageMenuOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [anyMenuOpen]);

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

  const matchingListings = listings
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

      return (
        matchesCategory &&
        matchesSearch &&
        (!onlyFavorites || favorites.isFavorite(item.id))
      );
    });
  const featured = listings[0]
    ? { ...listings[0], ...visualForLabel(listings[0].category, apiCategories) }
    : undefined;
  const favoritesCount = listings.filter((item) =>
    favorites.isFavorite(item.id),
  ).length;
  const filteredListings = sortListings(
    applyFilters(matchingListings, filters),
    filters.sort,
  );
  const totalPages = pageCount(filteredListings.length);
  const currentPage = Math.min(page, totalPages);
  const pageListings = paginate(filteredListings, currentPage);

  function handleToggleFavorites() {
    setOnlyFavorites((current) => !current);
    setPage(1);
  }

  function handleFiltersChange(value: CatalogFilters) {
    setFilters(value);
    setPage(1);
  }

  function handlePageChange(value: number) {
    setPage(value);
    document.getElementById("catalogue")?.scrollIntoView?.({ block: "start" });
  }

  function handleSearchChange(value: string) {
    if (value !== search) {
      setLoading(true);
    }

    setError("");
    setPage(1);
    setSearch(value);
  }

  function handleCategoryChange(value: string) {
    if (value !== category) {
      setLoading(true);
    }

    setError("");
    setPage(1);
    setCategory(value);
  }

  /** Entrées de l'en-tête : une même page, plusieurs façons de regarder le catalogue. */
  function showCatalogueView(view: "all" | "bargains" | "favorites", nextCategory = "Tout") {
    handleCategoryChange(nextCategory);
    setFilters(view === "bargains" ? BARGAIN_FILTERS : NO_FILTERS);
    setOnlyFavorites(view === "favorites");
    setPage(1);
  }

  /** La recherche de l'en-tête fonctionne depuis n'importe quelle page. */
  function handleHeaderSearch(value: string) {
    if (route.name !== "home") {
      window.location.hash = "#catalogue";
    }
    handleSearchChange(value);
  }

  function handleLogout() {
    setShowMyListings(false);
    setShowMyOrders(false);
    setShowAdmin(false);
    void logout();
  }

  const idle = useIdleLogout(Boolean(sessionUser), handleLogout);

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

    if (filteredListings.length === 0 && onlyFavorites && favoritesCount === 0) {
      return (
        <p className="empty-state">
          Vous n’avez pas encore de favori : cliquez sur ♡ sur une annonce pour
          la retrouver ici.
        </p>
      );
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
      {pageListings.map((item) => (
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
              aria-pressed={favorites.isFavorite(item.id)}
              aria-label={
                favorites.isFavorite(item.id)
                  ? `Retirer ${item.title} des favoris`
                  : `Ajouter ${item.title} aux favoris`
              }
              onClick={() => favorites.toggle(item.id)}
            >
              {favorites.isFavorite(item.id) ? "♥" : "♡"}
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

  const onCatalogue = route.name !== "info";
  const bargainsActive =
    onCatalogue && !onlyFavorites && filters.maxPrice === BARGAIN_FILTERS.maxPrice && filters.sort === BARGAIN_FILTERS.sort;
  const favoritesActive = onCatalogue && onlyFavorites;
  const catalogueActive =
    onCatalogue && !bargainsActive && !favoritesActive && category === "Tout" && !hasActiveFilters(filters);
  const categoryActive = (name: string) =>
    onCatalogue && !bargainsActive && !favoritesActive && category === name;

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Collector, accueil">
          <span className="brand-word">
            collector<span className="brand-dot">.</span>
          </span>
        </a>

        <label className="search header-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => handleHeaderSearch(event.target.value)}
            placeholder={t("search")}
            aria-label={t("searchLabel")}
          />
        </label>

        <nav className="navigation" aria-label="Informations">
          <a
            className={route.name === "info" && route.slug === "comment-ca-marche" ? "info-link active" : "info-link"}
            aria-current={route.name === "info" && route.slug === "comment-ca-marche" ? "page" : undefined}
            href={infoHref("comment-ca-marche")}
          >
            {t("howItWorks")}
          </a>
          <a
            className={route.name === "info" && route.slug === "faq" ? "active" : undefined}
            aria-current={route.name === "info" && route.slug === "faq" ? "page" : undefined}
            href={infoHref("faq")}
          >
            {t("help")}
          </a>
          <a
            className={favoritesActive ? "heart active" : "heart"}
            aria-current={favoritesActive ? "page" : undefined}
            aria-label={`${t("favorites")} (${favoritesCount})`}
            href="#catalogue"
            onClick={() => showCatalogueView("favorites")}
          >
            ♡
          </a>
        </nav>

        <div className="language-menu" ref={languageMenuRef}>
          <button
            type="button"
            className="language-toggle"
            aria-haspopup="true"
            aria-expanded={languageMenuOpen}
            aria-label={t("language")}
            onClick={() => setLanguageMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">🌐</span> {language.toUpperCase()}
          </button>

          <div className={languageMenuOpen ? "account-dropdown open" : "account-dropdown"} aria-label={t("language")}>
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                aria-pressed={language === item.code}
                onClick={() => {
                  setLanguage(item.code);
                  setLanguageMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="account-actions">
          {sessionUser ? (
            <>
              <div className="account-menu" ref={accountMenuRef}>
                <button
                  type="button"
                  className="account-toggle"
                  aria-haspopup="true"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  <span className="account-greeting">{t("hello")}, {sessionUser.username}</span>
                </button>

                <div
                  className={accountMenuOpen ? "account-dropdown open" : "account-dropdown"}
                  aria-label="Mon compte"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setShowMyListings(true);
                    }}
                  >
                    {t("myListings")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setShowMyOrders(true);
                    }}
                  >
                    {t("myOrders")}
                  </button>
                  {sessionUser.role === "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setShowAdmin(true);
                      }}
                    >
                      {t("admin")}
                    </button>
                  )}
                </div>
              </div>

              <NotificationBell />

              <button
                type="button"
                className="login-button"
                onClick={handleLogout}
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="login-button"
                onClick={() => void login()}
              >
                {t("login")}
              </button>

              <button
                type="button"
                className="sell-button"
                onClick={() => void register()}
              >
                {t("register")}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="trust-band">
        <span>🔒 {t("trustPayment")}</span>
        <span>✔ {t("trustModeration")}</span>
        <span>★ {t("trustReviews")}</span>
      </div>

      <nav className="category-tabs" aria-label="Navigation principale">
        <a
          className={catalogueActive ? "active" : undefined}
          aria-current={catalogueActive ? "page" : undefined}
          href="#catalogue"
          onClick={() => showCatalogueView("all")}
        >
          <TabGlyph kind="grid" />
          <span>{t("catalogue")}</span>
        </a>
        <a
          className={bargainsActive ? "active" : undefined}
          aria-current={bargainsActive ? "page" : undefined}
          href="#catalogue"
          onClick={() => showCatalogueView("bargains")}
        >
          <TabGlyph kind="tag" />
          <span>{t("bargains")}</span>
        </a>
        {apiCategories.map((item) => (
          <a
            key={item.name}
            className={categoryActive(item.name) ? "active" : undefined}
            aria-current={categoryActive(item.name) ? "page" : undefined}
            href="#catalogue"
            onClick={() => showCatalogueView("all", item.name)}
          >
            <ObjectArt kind={visualForLabel(item.name, apiCategories).art} size={46} />
            <span>{item.name}</span>
          </a>
        ))}
      </nav>

      {sessionUser && (
        <div className="sell-row">
          <button type="button" className="sell-button" onClick={() => setShowListingForm(true)}>
            {t("sell")}
          </button>
        </div>
      )}

      {idle.warning && (
        <IdleWarning secondsLeft={idle.secondsLeft} onStay={idle.stay} onLogout={handleLogout} />
      )}

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

          <dl className="hero-stats">
            <div>
              <dt>annonces en vente</dt>
              <dd>{listings.length}</dd>
            </div>
            <div>
              <dt>catégories</dt>
              <dd>{apiCategories.length}</dd>
            </div>
            <div>
              <dt>paiement</dt>
              <dd>sécurisé</dd>
            </div>
          </dl>
        </div>

        {featured && (
          <a
            className="hero-featured"
            href={listingHref(featured.id)}
            aria-label={`À la une : ${featured.title}`}
          >
            <span className="eyebrow">À LA UNE</span>
            <span className={`hero-featured-visual ${featured.tone}`}>
              {featured.image ? (
                <img src={featured.image} alt="" />
              ) : (
                <ObjectArt kind={featured.art} />
              )}
            </span>
            <span className="hero-featured-title">{featured.title}</span>
            <span className="hero-featured-bottom">
              <span>{featured.condition}</span>
              <strong>{formatEuros(featured.price)}</strong>
            </span>
          </a>
        )}
      </section>
        </>
      )}

      {route.name === "home" && (
        <>
      <section className="catalogue" id="catalogue">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LE CATALOGUE</span>
              <h2>À découvrir</h2>
            </div>
          </div>

          <CatalogueControls
            filters={filters}
            onChange={handleFiltersChange}
            count={filteredListings.length}
            favorites={{
              count: favoritesCount,
              active: onlyFavorites,
              onToggle: handleToggleFavorites,
            }}
          />

          {renderCatalogue()}

          <Pagination
            page={currentPage}
            pages={totalPages}
            onChange={handlePageChange}
          />
        </section>

        <section className="home-steps" aria-labelledby="home-steps-title">
          <span className="eyebrow">EN TROIS GESTES</span>
          <h2 id="home-steps-title">Comment ça marche</h2>
          <ol>
            <li>
              <strong>Trouvez</strong>
              <span>Parcourez le catalogue, filtrez, gardez vos coups de cœur en favoris.</span>
            </li>
            <li>
              <strong>Achetez</strong>
              <span>Payez en un clic ; le vendeur est prévenu et prépare l'envoi.</span>
            </li>
            <li>
              <strong>Recevez et notez</strong>
              <span>Confirmez la réception, puis laissez un avis au vendeur.</span>
            </li>
          </ol>
          <a className="details-button" href={infoHref("comment-ca-marche")}>
            Lire le mode d'emploi <span>→</span>
          </a>
        </section>
        </>
      )}

      {route.name === "info" && <InfoPage slug={route.slug} />}

      {route.name === "seller" && <SellerPage key={route.id} id={route.id} categories={apiCategories} />}

      {route.name === "listing" && (
        <ListingPage
          id={route.id}
          categories={apiCategories}
          refreshKey={catalogVersion}
          renderBuyAction={renderBuyAction}
        />
      )}

      <SiteFooter />

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