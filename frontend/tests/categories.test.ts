import { describe, expect, it } from "vitest";
import {
  ART_OPTIONS,
  fallbackCategories,
  visualForArt,
  visualForLabel,
  type Category,
} from "../src/categories";

describe("visualForLabel", () => {
  it.each([
    ["Timbres", "stamps", "sage"],
    ["Pièces", "coins", "rose"],
    ["Cartes postales", "postcards", "gold"],
    ["Autres objets", "other", "kraft"],
  ])("associe « %s » à l’illustration %s", (label, art, tone) => {
    expect(visualForLabel(label)).toEqual({ art, tone });
  });

  it("retombe sur « autres objets » pour une catégorie inconnue", () => {
    expect(visualForLabel("Vinyles")).toEqual({ art: "other", tone: "kraft" });
  });

  it("utilise l’illustration choisie par l’administrateur", () => {
    const custom: Category[] = [
      { id: "1", name: "Vinyles", art: "COINS" },
    ];

    expect(visualForLabel("Vinyles", custom)).toEqual({
      art: "coins",
      tone: "rose",
    });
  });
});

describe("visualForArt", () => {
  it("retombe sur « autres objets » pour une illustration inconnue", () => {
    expect(visualForArt("???" as never)).toEqual({ art: "other", tone: "kraft" });
  });
});

describe("listes par défaut", () => {
  it("propose quatre catégories de secours", () => {
    expect(fallbackCategories).toHaveLength(4);
  });

  it("propose les quatre illustrations", () => {
    expect(ART_OPTIONS.map((option) => option.value)).toEqual([
      "STAMPS",
      "COINS",
      "POSTCARDS",
      "OTHER",
    ]);
  });
});
