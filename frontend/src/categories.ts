import type { ArtKind } from "./ObjectArt";

export type CategoryVisual = {
  art: ArtKind;
  tone: string;
};

export const categoryLabels: Record<string, string> = {
  postcards: "Cartes postales",
  coins: "Pièces",
  stamps: "Timbres",
  other: "Autres objets",
};

export const categoryVisuals: Record<string, CategoryVisual> = {
  postcards: { art: "postcards", tone: "gold" },
  coins: { art: "coins", tone: "rose" },
  stamps: { art: "stamps", tone: "sage" },
  other: { art: "other", tone: "kraft" },
};

/** Illustration et couleur de fond d'une catégorie, à partir de son libellé. */
export function visualForLabel(label: string): CategoryVisual {
  const key = Object.entries(categoryLabels).find(
    ([, value]) => value === label,
  )?.[0];

  return (key ? categoryVisuals[key] : undefined) ?? categoryVisuals.other;
}
