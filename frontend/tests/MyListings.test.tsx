import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { setToken } from "../src/auth";
import MyListings from "../src/MyListings";
import {
  approvedListing,
  defaultCategories,
  jsonResponse,
  listingId,
  mockFetch,
  ownerId,
} from "./helpers";

const rejectedListing = {
  ...approvedListing,
  id: "33333333-3333-4333-8333-333333333333",
  name: "ihi",
  status: "REJECTED",
  moderationReason: "Les coordonnées personnelles sont interdites.",
};

function setup() {
  const onClose = vi.fn();

  render(
    <MyListings
      ownerId={ownerId}
      categories={defaultCategories}
      onClose={onClose}
    />,
  );

  return { onClose, user: userEvent.setup() };
}

describe("MyListings", () => {
  it("affiche les annonces avec leur statut et le motif de refus", async () => {
    setToken("jeton-123");
    const fetchMock = mockFetch(() =>
      jsonResponse([approvedListing, rejectedListing]),
    );
    setup();

    expect(
      await screen.findByRole("heading", { name: "Lot de timbres" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ihi" })).toBeInTheDocument();
    expect(screen.getByText("Approuvée")).toBeInTheDocument();
    expect(screen.getByText("Refusée")).toBeInTheDocument();
    expect(
      screen.getByText("Les coordonnées personnelles sont interdites."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Prix : 18,50 €")).toHaveLength(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/collectibles?ownerId=${ownerId}`);
    expect(init?.headers).toMatchObject({ Authorization: "Bearer jeton-123" });
  });

  it("indique quand il n’y a aucune annonce", async () => {
    mockFetch(() => jsonResponse([]));
    setup();

    expect(
      await screen.findByText(/pas encore déposé d.annonce/),
    ).toBeInTheDocument();
  });

  it("signale l’impossibilité de charger les annonces", async () => {
    mockFetch(() => new Response(null, { status: 500 }));
    setup();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Impossible de charger vos annonces.",
    );
  });

  it("supprime une annonce après confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = mockFetch((_url, init) =>
      init?.method === "DELETE"
        ? new Response(null, { status: 204 })
        : jsonResponse([approvedListing]),
    );
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Annonce supprimée.",
    );
    expect(
      screen.queryByRole("heading", { name: "Lot de timbres" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/collectibles/${listingId}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("ne supprime rien quand la confirmation est refusée", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = mockFetch(() => jsonResponse([approvedListing]));
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { name: "Lot de timbres" }),
    ).toBeInTheDocument();
  });

  it("signale un échec de suppression", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockFetch((_url, init) =>
      init?.method === "DELETE"
        ? new Response(null, { status: 500 })
        : jsonResponse([approvedListing]),
    );
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La suppression a échoué.",
    );
  });

  it("modifie une annonce puis recharge la liste", async () => {
    let current = { ...approvedListing };
    const fetchMock = mockFetch((_url, init) => {
      if (init?.method === "PUT") {
        current = { ...current, price: 20 };
        return jsonResponse(current);
      }

      return jsonResponse([current]);
    });
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Modifier" }));

    const price = screen.getByLabelText("Prix (€)");
    expect(price).toHaveValue(18.5);
    await user.clear(price);
    await user.type(price, "20");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Annonce modifiée et contrôlée à nouveau.",
    );
    expect(await screen.findByText("Prix : 20,00 €")).toBeInTheDocument();

    const putCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PUT",
    );
    expect(putCall?.[0]).toBe(`/api/collectibles/${listingId}`);
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      name: "Lot de timbres",
      category: "Timbres",
      description: "Série ancienne",
      price: 20,
      shippingCost: 2.5,
      condition: "GOOD",
    });
  });

  it("permet de changer tous les champs d’une annonce", async () => {
    const fetchMock = mockFetch((_url, init) =>
      init?.method === "PUT"
        ? jsonResponse(approvedListing)
        : jsonResponse([approvedListing]),
    );
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Modifier" }));
    const form = screen.getByRole("button", { name: "Enregistrer" }).closest("form");
    const edit = within(form as HTMLFormElement);

    await user.clear(edit.getByLabelText("Titre"));
    await user.type(edit.getByLabelText("Titre"), "Nouveau titre");
    await user.clear(edit.getByLabelText("Description"));
    await user.type(edit.getByLabelText("Description"), "Nouvelle description");
    await user.selectOptions(edit.getByLabelText("Catégorie"), "Pièces");
    await user.selectOptions(edit.getByLabelText("État"), "used");
    await user.clear(edit.getByLabelText(/Frais d.expédition/));
    await user.type(edit.getByLabelText(/Frais d.expédition/), "4");
    await user.click(edit.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "PUT",
      );
      expect(JSON.parse(String(putCall?.[1]?.body))).toMatchObject({
        name: "Nouveau titre",
        description: "Nouvelle description",
        category: "Pièces",
        condition: "USED",
        shippingCost: 4,
      });
    });
  });

  it("signale un échec de modification et permet d’annuler", async () => {
    mockFetch((_url, init) =>
      init?.method === "PUT"
        ? new Response(null, { status: 400 })
        : jsonResponse([approvedListing]),
    );
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Modifier" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /La modification a échoué/,
    );

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(
      screen.queryByRole("button", { name: "Enregistrer" }),
    ).not.toBeInTheDocument();
  });

  it("se ferme avec le bouton de fermeture", async () => {
    mockFetch(() => jsonResponse([]));
    const { onClose, user } = setup();

    await user.click(await screen.findByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
