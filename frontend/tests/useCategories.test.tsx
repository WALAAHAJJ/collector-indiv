import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fallbackCategories } from "../src/categories";
import { useCategories } from "../src/useCategories";
import { defaultCategories, jsonResponse, mockFetch } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCategories", () => {
  it("affiche les catégories de secours avant la réponse", () => {
    mockFetch(() => jsonResponse(defaultCategories));

    const { result } = renderHook(() => useCategories());

    expect(result.current.categories).toEqual(fallbackCategories);
  });

  it("charge les catégories depuis l’API", async () => {
    const custom = [{ id: "x", name: "Vinyles", art: "OTHER" }];
    mockFetch(() => jsonResponse(custom));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.categories).toEqual(custom));
  });

  it("garde la liste de secours si l’API répond une erreur", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, 500));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current.categories).toEqual(fallbackCategories);
  });

  it("garde la liste de secours si le réseau échoue", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("réseau")));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current.categories).toEqual(fallbackCategories);
  });

  it("recharge sur demande", async () => {
    let names = ["A"];
    mockFetch(() =>
      jsonResponse(names.map((name) => ({ id: name, name, art: "OTHER" }))),
    );

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.categories[0].name).toBe("A"));

    names = ["B"];
    await result.current.reload();

    await waitFor(() => expect(result.current.categories[0].name).toBe("B"));
  });
});
