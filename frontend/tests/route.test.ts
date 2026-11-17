import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { listingHref, parseRoute, useRoute } from "../src/route";

const id = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  window.location.hash = "";
});

describe("parseRoute", () => {
  it("reconnaît la page d'une annonce", () => {
    expect(parseRoute(`#/annonce/${id}`)).toEqual({ name: "listing", id });
  });

  it("accepte un identifiant en majuscules", () => {
    expect(parseRoute(`#/annonce/${id.toUpperCase()}`)).toEqual({ name: "listing", id: id.toUpperCase() });
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
