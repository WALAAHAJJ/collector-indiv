import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken, setToken } from "../src/auth";
import {
  fetchMyReviews,
  fetchSellerReviews,
  formatRating,
  postReview,
  reviewErrorMessage,
} from "../src/reviewsApi";
import { jsonResponse, listingId, mockFetch, ownerId } from "./helpers";

const review = {
  id: "r1",
  orderId: "44444444-4444-4444-8444-444444444444",
  buyerId: listingId,
  sellerId: ownerId,
  rating: 4,
  comment: "Bien",
  createdAt: "2026-11-20T10:00:00Z",
};

beforeEach(() => setToken("jeton"));

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe("formatRating", () => {
  it("affiche la note à la française", () => {
    expect(formatRating(4.5)).toBe("4,5");
    expect(formatRating(5)).toBe("5,0");
  });
});

describe("fetchSellerReviews", () => {
  it("renvoie la réputation du vendeur", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ sellerId: ownerId, average: 4.5, count: 2, reviews: [review] }),
    );

    const result = await fetchSellerReviews(ownerId);

    expect(fetchMock).toHaveBeenCalledWith(`/api/sellers/${ownerId}/reviews`);
    expect(result).toMatchObject({ average: 4.5, count: 2 });
    expect(result?.reviews).toHaveLength(1);
  });

  it("garde une moyenne absente et écarte les avis mal formés", async () => {
    mockFetch(() =>
      jsonResponse({ average: null, count: 0, reviews: [{ rating: 9 }, "x", null] }),
    );

    const result = await fetchSellerReviews(ownerId);

    expect(result?.average).toBeNull();
    expect(result?.reviews).toEqual([]);
  });

  it("renvoie null si l'API échoue ou répond autre chose", async () => {
    mockFetch(() => new Response(null, { status: 500 }));
    expect(await fetchSellerReviews(ownerId)).toBeNull();

    mockFetch(() => jsonResponse([]));
    expect(await fetchSellerReviews(ownerId)).toBeNull();
  });

  it("refuse un identifiant qui n'est pas un UUID", async () => {
    mockFetch(() => jsonResponse({}));

    expect(await fetchSellerReviews("../admin")).toBeNull();
  });
});

describe("fetchMyReviews", () => {
  it("envoie le jeton et renvoie les avis écrits", async () => {
    const fetchMock = mockFetch(() => jsonResponse([review]));

    expect(await fetchMyReviews()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/reviews/mine", {
      headers: { Authorization: "Bearer jeton" },
    });
  });

  it("renvoie une liste vide en cas d'erreur", async () => {
    mockFetch(() => new Response(null, { status: 401 }));

    expect(await fetchMyReviews()).toEqual([]);
  });
});

describe("postReview", () => {
  it("envoie la note et le commentaire nettoyé", async () => {
    const fetchMock = mockFetch(() => jsonResponse(review, 201));

    const saved = await postReview(review.orderId, 4, "  Bien  ");

    expect(saved.rating).toBe(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/orders/${review.orderId}/review`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ rating: 4, comment: "Bien" });
  });

  it("traduit les erreurs de l'API", async () => {
    mockFetch(() => new Response(null, { status: 409 }));

    await expect(postReview(review.orderId, 4, "")).rejects.toThrow("déjà noté");
  });

  it("signale un serveur injoignable", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("réseau")));

    await expect(postReview(review.orderId, 4, "")).rejects.toThrow("Impossible de contacter le serveur.");
  });
});

describe("reviewErrorMessage", () => {
  it("donne un message pour chaque code", () => {
    for (const status of [400, 401, 403, 404, 409, 500]) {
      expect(reviewErrorMessage(status).length).toBeGreaterThan(10);
    }
  });
});
