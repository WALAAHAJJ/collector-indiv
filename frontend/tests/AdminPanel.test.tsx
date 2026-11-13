import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AdminPanel from "../src/AdminPanel";
import { setToken } from "../src/auth";
import { approvedListing, jsonResponse, listingId, mockFetch } from "./helpers";

const pendingListing = {
  ...approvedListing,
  status: "PENDING_REVIEW",
  price: 7500,
  moderationReason: "Prix élevé : vérification complémentaire requise.",
};

function setup() {
  const onClose = vi.fn();

  render(<AdminPanel onClose={onClose} />);

  return { onClose, user: userEvent.setup() };
}

describe("AdminPanel", () => {
  it("charge les annonces en attente avec le jeton de l’administrateur", async () => {
    setToken("jeton-admin");
    const fetchMock = mockFetch(() => jsonResponse([pendingListing]));
    setup();

    expect(
      await screen.findByRole("heading", { name: "Lot de timbres" }),
    ).toBeInTheDocument();
    expect(screen.getByText("En attente de vérification")).toBeInTheDocument();
    expect(
      screen.getByText("Prix élevé : vérification complémentaire requise."),
    ).toBeInTheDocument();
    expect(screen.getByText("Prix : 7500,00 €")).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/collectibles?status=PENDING_REVIEW");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer jeton-admin" });
  });

  it("indique quand aucune annonce n’attend de vérification", async () => {
    mockFetch(() => jsonResponse([]));
    setup();

    expect(
      await screen.findByText("Aucune annonce en attente de vérification."),
    ).toBeInTheDocument();
  });

  it.each([
    [401, "Session expirée : reconnectez-vous."],
    [403, "Accès réservé aux administrateurs."],
    [500, "Impossible de charger les annonces."],
  ])("explique l’erreur %i", async (code, message) => {
    mockFetch(() => new Response(null, { status: code }));
    setup();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("change de statut et recharge la liste", async () => {
    const fetchMock = mockFetch((url) =>
      url.includes("APPROVED") ? jsonResponse([]) : jsonResponse([pendingListing]),
    );
    const { user } = setup();
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(screen.getByRole("button", { name: "En attente" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Approuvées" }));

    expect(await screen.findByText("Aucune annonce approuvée.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approuvées" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
      "/api/admin/collectibles?status=APPROVED",
    );
  });

  it("ne recharge pas quand on clique sur l’onglet déjà actif", async () => {
    const fetchMock = mockFetch(() => jsonResponse([]));
    const { user } = setup();
    await screen.findByText("Aucune annonce en attente de vérification.");

    await user.click(screen.getByRole("button", { name: "En attente" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("se ferme avec le bouton de fermeture", async () => {
    mockFetch(() => jsonResponse([]));
    const { onClose, user } = setup();

    await user.click(await screen.findByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("approuve une annonce puis recharge la liste", async () => {
    setToken("jeton-admin");
    let approved = false;
    const fetchMock = mockFetch((_url, init) => {
      if (init?.method === "POST") {
        approved = true;
        return jsonResponse({ ...pendingListing, status: "APPROVED" });
      }

      return jsonResponse(approved ? [] : [pendingListing]);
    });
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Approuver" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Annonce approuvée.");
    expect(
      await screen.findByText("Aucune annonce en attente de vérification."),
    ).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[0]).toBe(`/api/admin/collectibles/${listingId}/approve`);
    expect(postCall?.[1]?.headers).toMatchObject({ Authorization: "Bearer jeton-admin" });
  });

  it("ne propose pas d’approuver une annonce déjà approuvée", async () => {
    mockFetch(() => jsonResponse([{ ...pendingListing, status: "APPROVED" }]));
    setup();

    expect(await screen.findByRole("button", { name: "Refuser" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approuver" })).not.toBeInTheDocument();
  });

  it("refuse une annonce avec un motif", async () => {
    const fetchMock = mockFetch((_url, init) =>
      init?.method === "POST"
        ? jsonResponse({ ...pendingListing, status: "REJECTED" })
        : jsonResponse([pendingListing]),
    );
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Refuser" }));
    await user.type(screen.getByLabelText("Motif du refus"), "Photo non conforme");
    await user.click(screen.getByRole("button", { name: "Confirmer le refus" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Annonce refusée.");

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[0]).toBe(`/api/admin/collectibles/${listingId}/reject`);
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      reason: "Photo non conforme",
    });
  });

  it("exige un vrai motif pour refuser", async () => {
    const fetchMock = mockFetch(() => jsonResponse([pendingListing]));
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Refuser" }));
    await user.type(screen.getByLabelText("Motif du refus"), "   ");
    await user.click(screen.getByRole("button", { name: "Confirmer le refus" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Indiquez un motif de refus.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("permet d’annuler un refus", async () => {
    mockFetch(() => jsonResponse([pendingListing]));
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Refuser" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByLabelText("Motif du refus")).not.toBeInTheDocument();
  });

  it("supprime une annonce après confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let deleted = false;
    const fetchMock = mockFetch((_url, init) => {
      if (init?.method === "DELETE") {
        deleted = true;
        return new Response(null, { status: 204 });
      }

      return jsonResponse(deleted ? [] : [pendingListing]);
    });
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Annonce supprimée.");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/collectibles/${listingId}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("ne supprime rien quand la confirmation est refusée", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = mockFetch(() => jsonResponse([pendingListing]));
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Supprimer" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [500, "L’action a échoué. Réessayez."],
    [401, "Session expirée : reconnectez-vous."],
  ])("explique l’échec %i d’une action", async (code, message) => {
    mockFetch((_url, init) =>
      init?.method === "POST"
        ? new Response(null, { status: code })
        : jsonResponse([pendingListing]),
    );
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Approuver" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});
