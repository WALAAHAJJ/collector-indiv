import { describe, expect, it } from "vitest";
import { CATEGORIES_URL, adminCategoryUrl } from "../src/api";

describe("URLs des catégories", () => {
  it("lit les catégories publiques", () => {
    expect(CATEGORIES_URL).toBe("/api/categories");
  });

  it("crée une catégorie sans identifiant", () => {
    expect(adminCategoryUrl()).toBe("/api/admin/categories");
  });

  it("supprime une catégorie par son identifiant", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    expect(adminCategoryUrl(id)).toBe(`/api/admin/categories/${id}`);
  });

  it("refuse un identifiant qui n’est pas un UUID", () => {
    expect(() => adminCategoryUrl("../../etc")).toThrow("Identifiant invalide.");
  });
});
