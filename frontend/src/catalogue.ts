import type { CatalogListing } from "./listing";

/** Nombre d'annonces affichées par page du catalogue. */
export const PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "default", label: "Pertinence" },
  { value: "newest", label: "Plus récents" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "title", label: "Nom (A → Z)" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

/** États proposés dans le filtre, tels que `toCatalogListing` les affiche. */
export const CONDITION_OPTIONS = [
  "Neuf",
  "Très bon état",
  "Bon état",
  "État d’usage",
] as const;

export type CatalogFilters = {
  /** Bornes saisies à l'écran : texte brut, vide = pas de borne. */
  minPrice: string;
  maxPrice: string;
  /** Vide = tous les états. */
  condition: string;
  sort: SortKey;
};

export const NO_FILTERS: CatalogFilters = {
  minPrice: "",
  maxPrice: "",
  condition: "",
  sort: "default",
};

/** Convertit une saisie en nombre positif ; une saisie vide ou invalide n'impose aucune borne. */
export function parsePrice(raw: string): number | null {
  const value = Number.parseFloat(raw.trim().replace(",", "."));

  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export function applyFilters<T extends CatalogListing>(
  listings: T[],
  filters: CatalogFilters,
): T[] {
  const min = parsePrice(filters.minPrice);
  const max = parsePrice(filters.maxPrice);

  return listings.filter(
    (item) =>
      (min === null || item.price >= min) &&
      (max === null || item.price <= max) &&
      (filters.condition === "" || item.condition === filters.condition),
  );
}

/** Tri sans modifier la liste d'origine ; « default » garde l'ordre renvoyé par l'API. */
export function sortListings<T extends CatalogListing>(
  listings: T[],
  sort: SortKey,
): T[] {
  const copy = [...listings];

  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "newest":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    default:
      return copy;
  }
}

export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Découpe une page (numérotée à partir de 1) ; un numéro hors limites est ramené dans l'intervalle. */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = PAGE_SIZE,
): T[] {
  const safePage = Math.min(Math.max(1, page), pageCount(items.length, pageSize));
  const start = (safePage - 1) * pageSize;

  return items.slice(start, start + pageSize);
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    parsePrice(filters.minPrice) !== null ||
    parsePrice(filters.maxPrice) !== null ||
    filters.condition !== "" ||
    filters.sort !== "default"
  );
}
