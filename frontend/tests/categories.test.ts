import { describe, expect, it } from "vitest";
import { categoryLabels, visualForLabel } from "../src/categories";

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

  it("propose quatre catégories", () => {
    expect(Object.keys(categoryLabels)).toHaveLength(4);
  });
});
