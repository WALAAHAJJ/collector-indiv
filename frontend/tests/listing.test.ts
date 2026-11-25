import { describe, expect, it } from "vitest";
import { sellerLabel, toCatalogListing, type ApiListing } from "../src/listing";
import { listingId, ownerId } from "./helpers";

const api: ApiListing = {
  id: listingId,
  ownerId,
  name: "Lot de timbres",
  description: "Série ancienne",
  category: "Timbres",
  condition: "VERY_GOOD",
  price: 18.5,
  shippingCost: 2.5,
  hasPhoto: true,
  status: "APPROVED",
};

describe("toCatalogListing", () => {
  it("traduit l'état et construit l'adresse de la photo", () => {
    expect(toCatalogListing(api)).toEqual({
      id: listingId,
      ownerId,
      title: "Lot de timbres",
      description: "Série ancienne",
      category: "Timbres",
      condition: "Très bon état",
      price: 18.5,
      image: `/api/collectibles/${listingId}/photo`,
      shippingCost: 2.5,
      sold: false,
      createdAt: 0,
    });
  });

  it("convertit la date de création en millisecondes", () => {
    expect(toCatalogListing({ ...api, createdAt: "2026-11-01T10:00:00Z" }).createdAt).toBe(Date.parse("2026-11-01T10:00:00Z"));
    expect(toCatalogListing({ ...api, createdAt: "pas une date" }).createdAt).toBe(0);
  });

  it("garde l'état tel quel s'il est inconnu", () => {
    expect(toCatalogListing({ ...api, condition: "MINT" }).condition).toBe("MINT");
  });

  it("accepte une description absente et une annonce sans photo", () => {
    const listing = toCatalogListing({ ...api, description: null, hasPhoto: undefined });

    expect(listing.description).toBe("");
    expect(listing.image).toBe("");
  });

  it("repère une annonce vendue", () => {
    expect(toCatalogListing({ ...api, status: "SOLD" }).sold).toBe(true);
    expect(toCatalogListing({ ...api, status: undefined }).sold).toBe(false);
  });
});

describe("sellerLabel", () => {
  it("n'affiche que le début de l'identifiant, en majuscules", () => {
    expect(sellerLabel("d0000000-0000-4000-8000-000000000001")).toBe("Collectionneur n° D000");
  });
});
