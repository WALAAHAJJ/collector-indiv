import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "../src/AdminPanel";
import { setToken } from "../src/auth";
import { defaultCategories, jsonResponse, mockFetch } from "./helpers";

/** Les annonces de l’onglet voisin répondent toujours une liste vide. */
function mockCategoryApi(handler: () => Response) {
  const fetchMock = mockFetch((url) =>
    url.includes("/api/admin/categories") ? handler() : jsonResponse([]),
  );

  const categoryCalls = () =>
    fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/admin/categories"),
    );

  return { fetchMock, categoryCalls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function openCategories(categories = defaultCategories) {
  const onCategoriesChange = vi.fn();

  render(
    <AdminPanel
      categories={categories}
      onCategoriesChange={onCategoriesChange}
      onClose={vi.fn()}
    />,
  );

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Catégories" }));

  return { onCategoriesChange, user };
}

describe("onglet Catégories de l’administration", () => {
  it("liste les catégories existantes", async () => {
    mockCategoryApi(() => jsonResponse([]));
    await openCategories();

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getByText("Timbres")).toBeInTheDocument();
  });

  it("crée une catégorie avec l’illustration choisie", async () => {
    setToken("jeton-admin");
    const { categoryCalls } = mockCategoryApi(() =>
      jsonResponse({ id: "x", name: "Vinyles", art: "COINS" }, 201),
    );
    const { onCategoriesChange, user } = await openCategories();

    await user.type(screen.getByLabelText("Nom de la catégorie"), "  Vinyles ");
    await user.selectOptions(screen.getByLabelText("Illustration"), "COINS");
    await user.click(screen.getByRole("button", { name: "Ajouter la catégorie" }));

    expect(await screen.findByText("Catégorie « Vinyles » créée.")).toBeInTheDocument();

    const [url, init] = categoryCalls()[0];
    expect(url).toBe("/api/admin/categories");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer jeton-admin" });
    expect(JSON.parse(String(init?.body))).toEqual({ name: "Vinyles", art: "COINS" });
    expect(onCategoriesChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Nom de la catégorie")).toHaveValue("");
  });

  it("refuse un nom vide sans appeler le serveur", async () => {
    const { categoryCalls } = mockCategoryApi(() => jsonResponse({}));
    const { user } = await openCategories();

    await user.type(screen.getByLabelText("Nom de la catégorie"), "   ");
    await user.click(screen.getByRole("button", { name: "Ajouter la catégorie" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Indiquez le nom");
    expect(categoryCalls()).toHaveLength(0);
  });

  it("signale une catégorie déjà existante", async () => {
    mockCategoryApi(() => jsonResponse({}, 409));
    const { onCategoriesChange, user } = await openCategories();

    await user.type(screen.getByLabelText("Nom de la catégorie"), "Timbres");
    await user.click(screen.getByRole("button", { name: "Ajouter la catégorie" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("existe déjà");
    expect(onCategoriesChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nom de la catégorie")).toHaveValue("Timbres");
  });

  it.each([
    [401, "Session expirée"],
    [403, "réservé aux administrateurs"],
    [500, "L’action a échoué"],
  ])("explique l’erreur %i", async (status, text) => {
    mockCategoryApi(() => jsonResponse({}, status));
    const { user } = await openCategories();

    await user.type(screen.getByLabelText("Nom de la catégorie"), "Vinyles");
    await user.click(screen.getByRole("button", { name: "Ajouter la catégorie" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(text);
  });

  it("supprime une catégorie après confirmation", async () => {
    setToken("jeton-admin");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { categoryCalls } = mockCategoryApi(
      () => new Response(null, { status: 204 }),
    );
    const { onCategoriesChange, user } = await openCategories();

    await user.click(
      screen.getByRole("button", { name: "Supprimer la catégorie Pièces" }),
    );

    expect(await screen.findByText("Catégorie « Pièces » supprimée.")).toBeInTheDocument();
    expect(categoryCalls()[0][0]).toBe(
      `/api/admin/categories/${defaultCategories[1].id}`,
    );
    expect(categoryCalls()[0][1]?.method).toBe("DELETE");
    expect(onCategoriesChange).toHaveBeenCalledTimes(1);
  });

  it("ne supprime rien si l’administratrice annule", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { categoryCalls } = mockCategoryApi(
      () => new Response(null, { status: 204 }),
    );
    const { user } = await openCategories();

    await user.click(
      screen.getByRole("button", { name: "Supprimer la catégorie Pièces" }),
    );

    expect(categoryCalls()).toHaveLength(0);
  });

  it("explique qu’une catégorie utilisée ne peut pas être supprimée", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockCategoryApi(() => jsonResponse({}, 409));
    const { onCategoriesChange, user } = await openCategories();

    await user.click(
      screen.getByRole("button", { name: "Supprimer la catégorie Timbres" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "des annonces utilisent cette catégorie",
    );
    expect(onCategoriesChange).not.toHaveBeenCalled();
  });

  it("n’affiche pas de suppression pour les catégories de secours", async () => {
    mockCategoryApi(() => jsonResponse([]));
    await openCategories([{ id: "", name: "Timbres", art: "STAMPS" }]);

    expect(screen.queryByRole("button", { name: /Supprimer/ })).toBeNull();
  });

  it("revient aux annonces", async () => {
    mockCategoryApi(() => jsonResponse([]));
    const { user } = await openCategories();

    await user.click(screen.getByRole("button", { name: "Annonces" }));

    expect(
      await screen.findByText("Aucune annonce en attente de vérification."),
    ).toBeInTheDocument();
  });
});
