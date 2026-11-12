import { describe, expect, it } from "vitest";
import { catalogUrl, collectibleUrl, myCollectiblesUrl } from "../src/api";

const validId = "123e4567-e89b-42d3-a456-426614174000";

describe("collectibleUrl", () => {
  it("construit l’adresse d’une annonce à partir d’un UUID valide", () => {
    expect(collectibleUrl(validId)).toBe(`/api/collectibles/${validId}`);
  });

  it.each(["", "abc", "../admin", `${validId}/../x`, "1; DROP TABLE"])(
    "refuse l’identifiant invalide %j",
    (value) => {
      expect(() => collectibleUrl(value)).toThrow("Identifiant invalide.");
    },
  );
});

describe("myCollectiblesUrl", () => {
  it("construit l’adresse des annonces d’un propriétaire", () => {
    expect(myCollectiblesUrl(validId)).toBe(
      `/api/collectibles?ownerId=${validId}`,
    );
  });

  it("refuse un identifiant qui n’est pas un UUID", () => {
    expect(() => myCollectiblesUrl("moi")).toThrow("Identifiant invalide.");
  });
});

describe("catalogUrl", () => {
  it("n’ajoute aucun paramètre quand rien n’est filtré", () => {
    expect(catalogUrl("", "")).toBe("/api/collectibles/catalog");
  });

  it("encode la catégorie et la recherche", () => {
    const url = catalogUrl("Cartes postales", "paris & co");

    expect(url).toContain("category=Cartes+postales");
    expect(url).toContain("search=paris+%26+co");
  });

  it("limite la recherche à 100 caractères", () => {
    const url = catalogUrl("", "a".repeat(250));

    expect(url).toBe(`/api/collectibles/catalog?search=${"a".repeat(100)}`);
  });
});
