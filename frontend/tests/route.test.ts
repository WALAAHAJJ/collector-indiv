import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { INFO_PAGES, infoHref, listingHref, parseRoute, sellerHref, useRoute } from "../src/route";

const id = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  window.location.hash = "";
});

describe("parseRoute", () => {
  it("reconnaît la page d'une annonce", () => {
    expect(parseRoute(`#/annonce/${id}`)).toEqual({ name: "listing", id });
  });

  it("reconnaît la page d'un vendeur", () => {
    expect(parseRoute(`#/vendeur/${id}`)).toEqual({ name: "seller", id });
    expect(sellerHref(id)).toBe(`#/vendeur/${id}`);
    expect(parseRoute("#/vendeur/pas-un-uuid")).toEqual({ name: "home" });
  });

  it("accepte un identifiant en majuscules", () => {
    expect(parseRoute(`#/annonce/${id.toUpperCase()}`)).toEqual({ name: "listing", id: id.toUpperCase() });
  });

  it.each(INFO_PAGES)("reconnaît la page d'information %s", (slug) => {
    expect(parseRoute(`#/${slug}`)).toEqual({ name: "info", slug });
  });

  it.each(["#/inconnue", "#/faq/suite", "#faq", "#/", "#/FAQ"])("ne prend pas %j pour une page", (hash) => {
    expect(parseRoute(hash)).toEqual({ name: "home" });
  });

  it.each(["", "#", "#catalogue", "#/annonce/", "#/annonce/pas-un-uuid", `#/annonce/${id}/suite`, `#/autre/${id}`])(
    "renvoie l'accueil pour %j",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ name: "home" });
    },
  );
});

describe("listingHref", () => {
  it("construit l'adresse d'une annonce", () => {
    expect(listingHref(id)).toBe(`#/annonce/${id}`);
    expect(parseRoute(listingHref(id))).toEqual({ name: "listing", id });
  });
});

describe("infoHref", () => {
  it.each(INFO_PAGES)("construit l'adresse de %s", (slug) => {
    expect(infoHref(slug)).toBe(`#/${slug}`);
    expect(parseRoute(infoHref(slug))).toEqual({ name: "info", slug });
  });
});

describe("useRoute", () => {
  it("suit les changements d'adresse", async () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current).toEqual({ name: "home" });

    act(() => {
      window.location.hash = `#/annonce/${id}`;
    });

    await waitFor(() => expect(result.current).toEqual({ name: "listing", id }));

    act(() => {
      window.location.hash = "#catalogue";
    });

    await waitFor(() => expect(result.current).toEqual({ name: "home" }));
  });
});
