import type { TextKey } from "./i18n";
import type { ArtKind } from "./ObjectArt";

export type CategoryArtName = "STAMPS" | "COINS" | "POSTCARDS" | "FIGURINES" | "BOOKS" | "VINYLS" | "OTHER";

export type Category = {
  id: string;
  name: string;
  art: CategoryArtName;
};

export type CategoryVisual = {
  art: ArtKind;
  tone: string;
};

export const ART_OPTIONS = [
  { value: "STAMPS", label: "Timbre", key: "artStamp" },
  { value: "COINS", label: "Pièce", key: "artCoin" },
  { value: "POSTCARDS", label: "Cartes postales", key: "artPostcards" },
  { value: "FIGURINES", label: "Figurine", key: "artFigurine" },
  { value: "BOOKS", label: "Livre ancien", key: "artBook" },
  { value: "VINYLS", label: "Vinyle", key: "artVinyl" },
  { value: "OTHER", label: "Autre objet", key: "artOther" },
] as const satisfies readonly { value: CategoryArtName; label: string; key: TextKey }[];

const artVisuals: Record<CategoryArtName, CategoryVisual> = {
  STAMPS: { art: "stamps", tone: "sage" },
  COINS: { art: "coins", tone: "rose" },
  POSTCARDS: { art: "postcards", tone: "gold" },
  FIGURINES: { art: "figurines", tone: "sage" },
  BOOKS: { art: "books", tone: "kraft" },
  VINYLS: { art: "vinyls", tone: "rose" },
  OTHER: { art: "other", tone: "kraft" },
};

/**
 * Catégories affichées tant que l'API n'a pas répondu (ou si elle est
 * indisponible). Les identifiants vides indiquent qu'elles ne viennent pas
 * de la base : elles ne sont jamais proposées à la suppression.
 */
export const fallbackCategories: Category[] = [
  { id: "", name: "Cartes postales", art: "POSTCARDS" },
  { id: "", name: "Pièces", art: "COINS" },
  { id: "", name: "Timbres", art: "STAMPS" },
  { id: "", name: "Autres objets", art: "OTHER" },
];

export function visualForArt(art: CategoryArtName): CategoryVisual {
  return artVisuals[art] ?? artVisuals.OTHER;
}

/** Illustration et couleur de fond d'une catégorie, à partir de son nom. */
export function visualForLabel(
  label: string,
  categories: Category[] = fallbackCategories,
): CategoryVisual {
  const category = categories.find((item) => item.name === label);

  return visualForArt(category?.art ?? "OTHER");
}
