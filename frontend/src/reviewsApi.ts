import { MY_REVIEWS_URL, orderReviewUrl, sellerReviewsUrl } from "./api";
import { getToken } from "./auth";
import { tr } from "./i18n";

export const MAX_COMMENT_LENGTH = 500;

export type Review = {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type SellerReviews = {
  sellerId: string;
  /** Moyenne au dixième, `null` quand le vendeur n'a aucun avis. */
  average: number | null;
  count: number;
  reviews: Review[];
};

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Note affichée à la française : 4,5. */
export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** Ce que l'API renvoie n'est pas supposé juste : on ne garde que les avis bien formés. */
function isReview(value: unknown): value is Review {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.orderId === "string" &&
    typeof item.rating === "number" &&
    item.rating >= 1 &&
    item.rating <= 5
  );
}

/** Réputation publique d'un vendeur ; `null` si elle est indisponible (la fiche s'affiche sans). */
export async function fetchSellerReviews(sellerId: string): Promise<SellerReviews | null> {
  try {
    const response = await fetch(sellerReviewsUrl(sellerId));

    if (!response.ok) return null;

    const data = (await response.json()) as Partial<SellerReviews> | null;

    if (!data || typeof data.count !== "number" || !Array.isArray(data.reviews)) {
      return null;
    }

    return {
      sellerId,
      average: typeof data.average === "number" ? data.average : null,
      count: data.count,
      reviews: data.reviews.filter(isReview),
    };
  } catch {
    return null;
  }
}

/** Avis écrits par l'utilisateur connecté, pour savoir quelles commandes sont déjà notées. */
export async function fetchMyReviews(): Promise<Review[]> {
  try {
    const response = await fetch(MY_REVIEWS_URL, { headers: authHeaders() });

    if (!response.ok) return [];

    const data: unknown = await response.json();

    return Array.isArray(data) ? data.filter(isReview) : [];
  } catch {
    return [];
  }
}

export function reviewErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return tr("errReview400");
    case 401:
      return tr("errSession");
    case 403:
      return tr("errReview403");
    case 404:
      return tr("errOrderNotFound");
    case 409:
      return tr("errReview409");
    default:
      return tr("errReviewDefault");
  }
}

export async function postReview(
  orderId: string,
  rating: number,
  comment: string,
): Promise<Review> {
  let response: Response;

  try {
    response = await fetch(orderReviewUrl(orderId), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ rating, comment: comment.trim().slice(0, MAX_COMMENT_LENGTH) }),
    });
  } catch {
    throw new Error("Impossible de contacter le serveur.");
  }

  if (!response.ok) {
    throw new Error(reviewErrorMessage(response.status));
  }

  return (await response.json()) as Review;
}
