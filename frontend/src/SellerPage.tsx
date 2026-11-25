import { useEffect, useState } from "react";
import "./styles/listing-page.css";
import "./styles/seller-page.css";
import { catalogUrl } from "./api";
import { visualForLabel, type Category } from "./categories";
import { localeOf, useLanguage } from "./i18n";
import { sellerLabel, toCatalogListing, type ApiListing, type Listing } from "./listing";
import { formatEuros } from "./money";
import ObjectArt from "./ObjectArt";
import { listingHref } from "./route";
import { fetchSellerReviews, formatRating, type SellerReviews } from "./reviewsApi";
import Stars from "./Stars";

type SellerPageProps = Readonly<{
  id: string;
  categories: Category[];
}>;

type Listings = { status: "loading" } | { status: "error" } | { status: "ready"; items: Listing[] };

/** Profil public d'un vendeur : sa note, ses annonces en vente et les avis des acheteurs. */
export default function SellerPage({ id, categories }: SellerPageProps) {
  const { language, t } = useLanguage();
  const [listings, setListings] = useState<Listings>({ status: "loading" });
  const [reviews, setReviews] = useState<SellerReviews | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(catalogUrl("", ""))
      .then(async (response) => {
        if (!response.ok) throw new Error("indisponible");

        return (await response.json()) as ApiListing[];
      })
      .then((data) => {
        if (cancelled) return;

        const items = data
          .filter((item) => item.ownerId.toLowerCase() === id.toLowerCase())
          .map((item) => {
            const listing = toCatalogListing(item);

            return { ...listing, ...visualForLabel(listing.category, categories) };
          });

        setListings({ status: "ready", items });
      })
      .catch(() => {
        if (!cancelled) setListings({ status: "error" });
      });

    void fetchSellerReviews(id).then((data) => {
      if (!cancelled) setReviews(data);
    });

    return () => {
      cancelled = true;
    };
  }, [id, categories]);

  const onSale = listings.status === "ready" ? listings.items.filter((item) => !item.sold) : [];
  const soldCount = listings.status === "ready" ? listings.items.length - onSale.length : 0;

  return (
    <section className="listing-page seller-page" aria-labelledby="seller-title">
      <a className="back-link" href="#catalogue">
        {t("backToCatalogue")}
      </a>

      <header className="seller-header">
        <span className="eyebrow">{t("sellerEyebrow")}</span>
        <h1 id="seller-title">{sellerLabel(id)}</h1>

        {reviews && reviews.average !== null ? (
          <p className="seller-rating">
            <Stars value={reviews.average} /> {formatRating(reviews.average)} ({t("reviewsCount", { count: reviews.count })})
          </p>
        ) : (
          <p className="seller-rating">{t("noReviewsYet")}</p>
        )}

        {listings.status === "ready" && (
          <p className="seller-stats">
            {t(onSale.length > 1 ? "onSaleMany" : "onSaleOne", { count: onSale.length })} ·{" "}
            {t(soldCount > 1 ? "soldMany" : "soldOne", { count: soldCount })}
          </p>
        )}
      </header>

      <h2>{t("forSaleTitle")}</h2>

      {listings.status === "loading" && <p className="empty-state">{t("loadingListings")}</p>}

      {listings.status === "error" && (
        <p className="empty-state" role="alert">
          {t("sellerListingsUnavailable")}
        </p>
      )}

      {listings.status === "ready" && onSale.length === 0 && (
        <p className="empty-state">{t("sellerNoListings")}</p>
      )}

      {onSale.length > 0 && (
        <ul className="seller-listings">
          {onSale.map((item) => (
            <li key={item.id}>
              <a href={listingHref(item.id)}>
                <span className={`similar-visual item-visual ${item.tone}`}>
                  {item.image ? (
                    <img className="listing-photo" src={item.image} alt="" />
                  ) : (
                    <ObjectArt kind={item.art} size={90} />
                  )}
                </span>
                <span className="item-category">{item.category}</span>
                <span className="similar-title">{item.title}</span>
                <strong>{formatEuros(item.price)}</strong>
              </a>
            </li>
          ))}
        </ul>
      )}

      {reviews && reviews.reviews.length > 0 && (
        <div className="seller-reviews">
          <h2>{t("buyerReviewsTitle")}</h2>
          <ul>
            {reviews.reviews.map((item) => (
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
    </section>
  );
}
