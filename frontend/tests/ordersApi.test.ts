import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken, setToken } from "../src/auth";
import {
  CARD_NUMBER_PATTERN,
  CVC_PATTERN,
  EXPIRY_PATTERN,
  fetchPurchases,
  fetchSales,
  purchase,
  purchaseErrorMessage,
} from "../src/ordersApi";
import { jsonResponse, listingId, mockFetch } from "./helpers";

const input = {
  listingId,
  cardNumber: "4242 4242 4242 4242",
  cardHolder: "Walaa Test",
  expiry: "12/40",
  cvc: "123",
};

const order = {
  id: "44444444-4444-4444-8444-444444444444",
  listingId,
  listingName: "Lot de timbres",
  buyerId: "55555555-5555-4555-8555-555555555555",
  sellerId: "66666666-6666-4666-8666-666666666666",
  itemPrice: 20,
  shippingCost: 3,
  commission: 1,
  buyerTotal: 23,
  sellerNet: 22,
  cardLast4: "4242",
  createdAt: "2026-11-17T10:00:00Z",
};

beforeEach(() => setToken("jeton"));

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe("purchase", () => {
  it("envoie l'achat avec le jeton et renvoie la commande", async () => {
    const fetchMock = mockFetch(() => jsonResponse(order, 201));

    await expect(purchase(input)).resolves.toEqual(order);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer jeton" });
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it.each([
    [400, "invalides"],
    [401, "Session expirée"],
    [402, "Aucun montant n’a été prélevé"],
    [403, "propre annonce"],
    [404, "n’est plus disponible"],
    [409, "vient d’être vendue"],
    [500, "momentanément indisponible"],
  ])("traduit la réponse %i en message lisible", async (status, text) => {
    mockFetch(() => jsonResponse({}, status));

    await expect(purchase(input)).rejects.toThrow(text);
  });

  it("signale un serveur injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("réseau"))));

    await expect(purchase(input)).rejects.toThrow("Impossible de contacter le serveur.");
  });

  it("donne le même message que purchaseErrorMessage", () => {
    expect(purchaseErrorMessage(402)).toContain("Paiement refusé");
  });
});

describe("fetchPurchases et fetchSales", () => {
  it("lisent les achats et les ventes avec le jeton", async () => {
    const fetchMock = mockFetch(() => jsonResponse([order]));

    await expect(fetchPurchases()).resolves.toEqual([order]);
    await expect(fetchSales()).resolves.toEqual([order]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/orders/purchases",
      "/api/orders/sales",
    ]);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer jeton",
    });
  });

  it("traite une réponse inattendue comme une liste vide", async () => {
    mockFetch(() => jsonResponse({ erreur: true }));

    await expect(fetchPurchases()).resolves.toEqual([]);
  });

  it("signale une session expirée", async () => {
    mockFetch(() => jsonResponse({}, 401));

    await expect(fetchSales()).rejects.toThrow("Session expirée");
  });

  it("signale un service indisponible", async () => {
    mockFetch(() => jsonResponse({}, 503));

    await expect(fetchPurchases()).rejects.toThrow("momentanément indisponibles");
  });
});

describe("formats de carte", () => {
  it("acceptent les saisies valides", () => {
    expect(CARD_NUMBER_PATTERN.test("4242 4242 4242 4242")).toBe(true);
    expect(CARD_NUMBER_PATTERN.test("4242-4242-4242-4242")).toBe(true);
    expect(EXPIRY_PATTERN.test("01/30")).toBe(true);
    expect(CVC_PATTERN.test("1234")).toBe(true);
  });

  it("refusent les saisies invalides", () => {
    expect(CARD_NUMBER_PATTERN.test("abcd")).toBe(false);
    expect(CARD_NUMBER_PATTERN.test("4242")).toBe(false);
    expect(EXPIRY_PATTERN.test("13/30")).toBe(false);
    expect(EXPIRY_PATTERN.test("1/30")).toBe(false);
    expect(CVC_PATTERN.test("12")).toBe(false);
  });
});
