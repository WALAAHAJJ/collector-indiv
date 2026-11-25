import { useEffect, useState, type ReactNode } from "react";
import "./styles/listing-page.css";
import { catalogUrl, publicListingUrl } from "./api";
import { visualForLabel, type Category } from "./categories";
import { conditionText, sellerLabel, toCatalogListing, type ApiListing, type Listing } from "./listing";
import { listingHref, sellerHref } from "./route";
import { formatEuros } from "./money";
import ObjectArt from "./ObjectArt";
import Stars from "./Stars";
import { localeOf, useLanguage } from "./i18n";
import { fetchSellerReviews, formatRating, type SellerReviews } from "./reviewsApi";

type ListingPageProps = Readonly<{
  id: string;
  categories: Category[];
  /** Incrémenté après un achat pour recharger la fiche (elle passe à « vendue »). */
  refreshKey: number;
  renderBuyAction: (listing: Listing) => ReactNode;
}>;

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "ready"; listing: Listing };

const MAX_SIMILAR = 4;
const MAX_REVIEWS_SHOWN = 5;

export default function ListingPage({ id, categories, refreshKey, renderBuyAction }: ListingPageProps) {
  const { language, t } = useLanguage();
  const [state, setState] = useState<State>({ status: "loading" });
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [copied, setCopied] = useState(false);
  const [sellerReviews, setSellerReviews] = useState<SellerReviews | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(publicListingUrl(id))
      .then(async (response) => {
        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error("indisponible");
        }

        return (await response.json()) as ApiListing;
      })
      .then((data) => {
        if (cancelled) return;

        if (!data) {
          setState({ status: "missing" });
          return;
        }

        const item = toCatalogListing(data);
        setState({ status: "ready", listing: { ...item, ...visualForLabel(item.category, categories) } });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, categories, refreshKey]);

  const category = state.status === "ready" ? state.listing.category : "";
  const ownerId = state.status === "ready" ? state.listing.ownerId : "";

  useEffect(() => {
    if (!ownerId) return;

    let cancelled = false;

    void fetchSellerReviews(ownerId).then((data) => {
      if (!cancelled) setSellerReviews(data);
    });

    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  useEffect(() => {
    if (!category) return;

    let cancelled = false;

    fetch(catalogUrl(category, ""))
      .then(async (response) => (response.ok ? ((await response.json()) as ApiListing[]) : []))
      .then((data) => {
        if (cancelled) return;

        setSimilar(
          data
            .filter((item) => item.id !== id)
            .slice(0, MAX_SIMILAR)
            .map((item) => {
              const listing = toCatalogListing(item);
              return { ...listing, ...visualForLabel(listing.category, categories) };
            }),
        );
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });

    return () => {
      cancelled = true;
    };
  }, [category, id, categories, refreshKey]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(globalThis.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const backLink = (
    <a className="back-link" href="#catalogue">
      {t("backToCatalogue")}
    </a>
  );

  if (state.status === "loading") {
    return (
      <section className="listing-page">
        {backLink}
        <p className="empty-state">{t("loadingListing")}</p>
      </section>
    );
  }

  if (state.status === "missing" || state.status === "error") {
    return (
      <section className="listing-page">
        {backLink}
        <p className="empty-state" role="alert">
          {state.status === "missing" ? t("listingMissing") : t("listingUnavailable")}
        </p>
      </section>
    );
  }

  const { listing } = state;

  return (
    <section className="listing-page" aria-labelledby="listing-page-title">
      {backLink}

      <div className="listing-page-layout">
        <div className={`listing-page-visual item-visual ${listing.tone}`}>
          {listing.image ? (
            <img className="listing-photo" src={listing.image} alt={listing.title} />
          ) : (
            <ObjectArt kind={listing.art} size={260} />
          )}
        </div>

        <div className="listing-page-info">
          <span className="item-category">{listing.category}</span>
          <h1 id="listing-page-title">{listing.title}</h1>

          <p className="listing-page-seller">
            {t("offeredBy")} <a href={sellerHref(listing.ownerId)}>{sellerLabel(listing.ownerId)}</a>
            {sellerReviews && sellerReviews.average !== null && (
              <span className="seller-rating">
                {" · "}
                <Stars value={sellerReviews.average} /> {formatRating(sellerReviews.average)} (
                {t("reviewsCount", { count: sellerReviews.count })})
              </span>
            )}
          </p>

          <div className="modal-price">
            <span>{conditionText(listing.condition, t)}</span>
            <strong>{formatEuros(listing.price)}</strong>
          </div>

          <p className="shipping-cost">{t("shippingCost", { amount: formatEuros(listing.shippingCost) })}</p>
          <p className="listing-page-total">
            {t("estimatedTotal")} <strong>{formatEuros(listing.price + listing.shippingCost)}</strong>
          </p>

          {listing.sold ? (
            <p className="sold-banner" role="status">
              {t("soldBanner")}
            </p>
          ) : (
            renderBuyAction(listing)
          )}

          <button type="button" className="my-listings-button copy-link" onClick={() => void copyLink()}>
            {t("copyLink")}
          </button>
          {copied && <output className="purchase-note">{t("linkCopied")}</output>}
        </div>
      </div>

      <div className="listing-page-description">
        <h2>{t("descriptionTitle")}</h2>
        <p>{listing.description || t("noDescription")}</p>
      </div>

      {sellerReviews && sellerReviews.reviews.length > 0 && (
        <div className="seller-reviews">
          <h2>{t("sellerReviewsTitle")}</h2>
          <ul>
            {sellerReviews.reviews.slice(0, MAX_REVIEWS_SHOWN).map((item) => (
              <li key={item.id}>
                <Stars value={item.rating} />
                {item.comment && <p>{item.comment}</p>}
                <span className="review-meta">
                  {sellerLabel(item.buyerId)} · {new Date(item.createdAt).toLocaleDateString(localeOf(language))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {similar.length > 0 && (
        <div className="similar-listings">
          <h2>{t("similarTitle")}</h2>
          <ul>
            {similar.map((item) => (
              <li key={item.id}>
                <a href={listingHref(item.id)}>
                  <span className={`similar-visual item-visual ${item.tone}`}>
                    {item.image ? (
                      <img className="listing-photo" src={item.image} alt="" />
                    ) : (
                      <ObjectArt kind={item.art} size={70} />
                    )}
                  </span>
                  <span className="similar-title">{item.title}</span>
                  <strong>{formatEuros(item.price)}</strong>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
