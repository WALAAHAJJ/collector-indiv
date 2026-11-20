import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  readFavorites,
  toggleId,
  useFavorites,
  writeFavorites,
} from "../src/favorites";

beforeEach(() => localStorage.clear());

describe("toggleId", () => {
  it("ajoute puis retire sans modifier la liste d'origine", () => {
    const base = ["a"];

    expect(toggleId(base, "b")).toEqual(["a", "b"]);
    expect(toggleId(["a", "b"], "a")).toEqual(["b"]);
    expect(base).toEqual(["a"]);
  });
});

describe("readFavorites et writeFavorites", () => {
  it("relit ce qui a été écrit, par utilisateur", () => {
    writeFavorites("u1", ["x", "y"]);

    expect(readFavorites("u1")).toEqual(["x", "y"]);
    expect(readFavorites("u2")).toEqual([]);
  });

  it("ignore un contenu illisible ou de mauvais type", () => {
    localStorage.setItem("collector:favoris:u1", "pas du json");
    expect(readFavorites("u1")).toEqual([]);

    localStorage.setItem("collector:favoris:u1", '{"a":1}');
    expect(readFavorites("u1")).toEqual([]);

    localStorage.setItem("collector:favoris:u1", '["ok", 3, null]');
    expect(readFavorites("u1")).toEqual(["ok"]);
  });
});

describe("useFavorites", () => {
  it("bascule un favori et le conserve", () => {
    const { result } = renderHook(() => useFavorites("u1"));

    act(() => result.current.toggle("a"));

    expect(result.current.isFavorite("a")).toBe(true);
    expect(readFavorites("u1")).toEqual(["a"]);

    act(() => result.current.toggle("a"));

    expect(result.current.isFavorite("a")).toBe(false);
    expect(readFavorites("u1")).toEqual([]);
  });

  it("charge la liste de l'utilisateur courant", () => {
    writeFavorites("u1", ["a"]);
    writeFavorites("u2", ["b"]);

    const { result, rerender } = renderHook(({ key }) => useFavorites(key), {
      initialProps: { key: "u1" },
    });

    expect(result.current.ids).toEqual(["a"]);

    rerender({ key: "u2" });

    expect(result.current.ids).toEqual(["b"]);
  });
});
