import type { ArtKind } from "./ObjectArt";

export type CategoryArtName = "STAMPS" | "COINS" | "POSTCARDS" | "OTHER";

export type Category = {
  id: string;
  name: string;
  art: CategoryArtName;
};

export type CategoryVisual = {
  art: ArtKind;
  tone: string;
};

export const ART_OPTIONS: { value: CategoryArtName; label: string }[] = [
  { value: "STAMPS", label: "Timbre" },
  { value: "COINS", label: "Pièce" },
  { value: "POSTCARDS", label: "Cartes postales" },
  { value: "OTHER", label: "Autre objet" },
];

const artVisuals: Record<CategoryArtName, CategoryVisual> = {
  STAMPS: { art: "stamps", tone: "sage" },
  COINS: { art: "coins", tone: "rose" },
  POSTCARDS: { art: "postcards", tone: "gold" },
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
