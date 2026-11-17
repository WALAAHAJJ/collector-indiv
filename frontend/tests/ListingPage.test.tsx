import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ListingPage from "../src/ListingPage";
import { approvedListing, defaultCategories, jsonResponse, listingId, mockFetch } from "./helpers";

const otherId = "33333333-3333-4333-8333-333333333333";

type Handlers = {
  detail?: () => Response;
  catalog?: () => Response;
};

function mockApi(handlers: Handlers = {}) {
  return mockFetch((url) =>
    url === `/api/collectibles/catalog/${listingId}`
      ? (handlers.detail?.() ?? jsonResponse(approvedListing))
      : (handlers.catalog?.() ??
        jsonResponse([approvedListing, { ...approvedListing, id: otherId, name: "Série Europa" }])),
  );
}

function renderPage(refreshKey = 0) {
  return render(
    <ListingPage
      id={listingId}
      categories={defaultCategories}
      refreshKey={refreshKey}
      renderBuyAction={() => <button type="button">Acheter</button>}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ListingPage", () => {
  it("affiche la fiche complète avec le total estimé", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Lot de timbres" })).toBeInTheDocument();
    expect(screen.getByText("Série ancienne")).toBeInTheDocument();
    expect(screen.getByText("Bon état")).toBeInTheDocument();
    expect(screen.getByText("Frais d’expédition : 2,50 €")).toBeInTheDocument();
    expect(screen.getByText("21,00 €")).toBeInTheDocument();
    expect(screen.getByText(/Proposé par Collectionneur n° 1111/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acheter" })).toBeInTheDocument();
  });

  it("affiche un chargement avant la réponse", () => {
    mockFetch(() => new Promise<Response>(() => undefined));
    renderPage();

    expect(screen.getByText("Chargement de l’annonce…")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Retour au catalogue/ })).toHaveAttribute("href", "#catalogue");
  });

  it("indique une description par défaut", async () => {
    mockApi({ detail: () => jsonResponse({ ...approvedListing, description: null }) });
    renderPage();

    expect(await screen.findByText("Aucune description renseignée.")).toBeInTheDocument();
  });

  it("remplace le bouton d'achat par un bandeau quand l'annonce est vendue", async () => {
    mockApi({ detail: () => jsonResponse({ ...approvedListing, status: "SOLD" }) });
    renderPage();

    expect(await screen.findByText("Cette annonce a été vendue.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acheter" })).toBeNull();
  });

  it("dit que l'annonce n'existe pas pour une 404", async () => {
    mockApi({ detail: () => jsonResponse({}, 404) });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("n’existe pas ou n’est plus disponible");
  });

  it("signale une erreur du serveur", async () => {
    mockApi({ detail: () => jsonResponse({}, 500) });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("momentanément indisponible");
  });

  it("signale un serveur injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("réseau")));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("momentanément indisponible");
  });

  it("propose d'autres annonces de la catégorie, sans l'annonce affichée", async () => {
    mockApi();
    renderPage();

    const link = await screen.findByRole("link", { name: /Série Europa/ });

    expect(link).toHaveAttribute("href", `#/annonce/${otherId}`);
    expect(screen.queryByRole("link", { name: /Lot de timbres/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "Dans la même catégorie" })).toBeInTheDocument();
  });

  it("n'affiche pas la rubrique quand il n'y a rien d'autre", async () => {
    mockApi({ catalog: () => jsonResponse([approvedListing]) });
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Lot de timbres" });

    expect(screen.queryByRole("heading", { name: "Dans la même catégorie" })).toBeNull();
  });

  it("ignore une liste de catégorie indisponible", async () => {
    mockApi({ catalog: () => jsonResponse({}, 503) });
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Lot de timbres" });

    expect(screen.queryByRole("heading", { name: "Dans la même catégorie" })).toBeNull();
  });

  it("copie le lien de l'annonce", async () => {
    mockApi();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    await user.click(await screen.findByRole("button", { name: /Copier le lien/ }));

    expect(writeText).toHaveBeenCalledWith(globalThis.location.href);
    expect(await screen.findByText("Lien copié.")).toBeInTheDocument();
  });

  it("n'affiche pas « Lien copié » si la copie est refusée", async () => {
    mockApi();
    const writeText = vi.fn().mockRejectedValue(new Error("refusé"));
    const user = userEvent.setup();
    renderPage();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    await user.click(await screen.findByRole("button", { name: /Copier le lien/ }));

    expect(writeText).toHaveBeenCalled();
    expect(screen.queryByText("Lien copié.")).toBeNull();
  });

  it("recharge la fiche quand la clé de rafraîchissement change", async () => {
    const fetchMock = mockApi();
    const { rerender } = renderPage(0);
    await screen.findByRole("heading", { level: 1, name: "Lot de timbres" });
    const callsBefore = fetchMock.mock.calls.length;

    rerender(
      <ListingPage
        id={listingId}
        categories={defaultCategories}
        refreshKey={1}
        renderBuyAction={() => null}
      />,
    );

    await screen.findByRole("heading", { level: 1, name: "Lot de timbres" });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
