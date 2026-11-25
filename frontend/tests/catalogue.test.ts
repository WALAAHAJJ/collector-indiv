import { describe, expect, it } from "vitest";
import {
  NO_FILTERS,
  PAGE_SIZE,
  applyFilters,
  hasActiveFilters,
  isSortKey,
  pageCount,
  paginate,
  parsePrice,
  sortListings,
} from "../src/catalogue";
import type { CatalogListing } from "../src/listing";

function listing(title: string, price: number, condition = "Bon état", createdAt = 0): CatalogListing {
  return {
    id: title,
    ownerId: "o",
    title,
    description: "",
    category: "Vinyles",
    condition,
    price,
    image: "",
    shippingCost: 3,
    sold: false,
    createdAt,
  };
}

const sample = [
  listing("Zébulon", 30, "Neuf"),
  listing("Album", 10, "Bon état"),
  listing("Médaille", 20, "Neuf"),
  listing("Étui", 5, "État d’usage"),
];

describe("parsePrice", () => {
  it("accepte la virgule française", () => {
    expect(parsePrice("12,50")).toBe(12.5);
  });

  it("ignore une saisie vide, négative ou invalide", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("-3")).toBeNull();
  });
});

describe("applyFilters", () => {
  it("ne change rien sans filtre", () => {
    expect(applyFilters(sample, NO_FILTERS)).toHaveLength(4);
  });

  it("filtre par fourchette de prix, bornes incluses", () => {
    const result = applyFilters(sample, { ...NO_FILTERS, minPrice: "10", maxPrice: "20" });

    expect(result.map((item) => item.title)).toEqual(["Album", "Médaille"]);
  });

  it("filtre par état", () => {
    const result = applyFilters(sample, { ...NO_FILTERS, condition: "Neuf" });

    expect(result.map((item) => item.title)).toEqual(["Zébulon", "Médaille"]);
  });

  it("combine prix et état", () => {
    const result = applyFilters(sample, { ...NO_FILTERS, maxPrice: "25", condition: "Neuf" });

    expect(result.map((item) => item.title)).toEqual(["Médaille"]);
  });

  it("ignore une borne invalide", () => {
    expect(applyFilters(sample, { ...NO_FILTERS, minPrice: "xx" })).toHaveLength(4);
  });
});

describe("sortListings", () => {
  it("met les annonces les plus récentes en premier avec « newest »", () => {
    const dated = [listing("Ancien", 1, "Neuf", 1000), listing("Récent", 2, "Neuf", 3000), listing("Milieu", 3, "Neuf", 2000)];

    expect(sortListings(dated, "newest").map((i) => i.title)).toEqual(["Récent", "Milieu", "Ancien"]);
  });

  it("trie par prix croissant et décroissant", () => {
    expect(sortListings(sample, "price-asc").map((i) => i.price)).toEqual([5, 10, 20, 30]);
    expect(sortListings(sample, "price-desc").map((i) => i.price)).toEqual([30, 20, 10, 5]);
  });

  it("trie par nom en respectant les accents", () => {
    expect(sortListings(sample, "title").map((i) => i.title)).toEqual([
      "Album",
      "Étui",
      "Médaille",
      "Zébulon",
    ]);
  });

  it("garde l'ordre d'origine par défaut, sans modifier la liste", () => {
    const sorted = sortListings(sample, "default");

    expect(sorted.map((i) => i.title)).toEqual(sample.map((i) => i.title));
    expect(sorted).not.toBe(sample);
    sortListings(sample, "price-asc");
    expect(sample[0].title).toBe("Zébulon");
  });
});

describe("pagination", () => {
  const items = Array.from({ length: 30 }, (_, index) => index + 1);

  it("calcule le nombre de pages, au moins 1", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
    expect(pageCount(30)).toBe(3);
  });

  it("découpe chaque page", () => {
    expect(paginate(items, 1)).toHaveLength(PAGE_SIZE);
    expect(paginate(items, 3)).toEqual([25, 26, 27, 28, 29, 30]);
  });

  it("ramène un numéro de page hors limites dans l'intervalle", () => {
    expect(paginate(items, 99)).toEqual([25, 26, 27, 28, 29, 30]);
    expect(paginate(items, 0)[0]).toBe(1);
  });
});

describe("hasActiveFilters et isSortKey", () => {
  it("détecte un filtre actif", () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, sort: "title" })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, minPrice: "5" })).toBe(true);
  });

  it("valide les clés de tri", () => {
    expect(isSortKey("price-asc")).toBe(true);
    expect(isSortKey("hack")).toBe(false);
  });
});
