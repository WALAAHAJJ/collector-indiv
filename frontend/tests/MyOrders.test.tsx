import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyOrders from "../src/MyOrders";
import { clearToken, setToken } from "../src/auth";
import { jsonResponse, listingId, mockFetch } from "./helpers";

const order = {
  id: "44444444-4444-4444-8444-444444444444",
  listingId,
  listingName: "Lot de timbres",
  buyerId: "55555555-5555-4555-8555-555555555555",
  sellerId: "66666666-6666-4666-8666-666666666666",
  itemPrice: 20,
  shippingCost: 3,
  commission: 1,
  buyerTotal: 23,
  sellerNet: 22,
  cardLast4: "4242",
  createdAt: "2026-11-17T10:00:00Z",
  status: "PAID" as const,
  shippedAt: null,
  deliveredAt: null,
};

beforeEach(() => setToken("jeton"));

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

const shippedOrder = { ...order, status: "SHIPPED" as const, shippedAt: "2026-11-18T09:00:00Z" };

function mockOrders(purchases: unknown[], sales: unknown[]) {
  return mockFetch((url) =>
    url === "/api/orders/purchases" ? jsonResponse(purchases) : jsonResponse(sales),
  );
}

describe("MyOrders", () => {
  it("affiche d'abord les achats avec le total payé et la carte", async () => {
    mockOrders([order], []);
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Lot de timbres" })).toBeInTheDocument();
    expect(screen.getByText("Total payé").nextSibling).toHaveTextContent("23,00 €");
    expect(screen.getByText("•••• 4242")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes achats" })).toHaveAttribute("aria-pressed", "true");
  });

  it("affiche les ventes avec la commission et le gain net", async () => {
    mockOrders([], [order]);
    const user = userEvent.setup();
    render(<MyOrders onClose={vi.fn()} />);
    await screen.findByText("Vous n’avez encore rien acheté.");

    await user.click(screen.getByRole("button", { name: "Mes ventes" }));

    expect(await screen.findByRole("heading", { name: "Lot de timbres" })).toBeInTheDocument();
    expect(screen.getByText("Commission du site (5 %)").nextSibling).toHaveTextContent("− 1,00 €");
    expect(screen.getByText("Votre gain net").nextSibling).toHaveTextContent("22,00 €");
    expect(screen.queryByText("Total payé")).toBeNull();
  });

  it("dit qu'il n'y a rien quand les listes sont vides", async () => {
    mockOrders([], []);
    const user = userEvent.setup();
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByText("Vous n’avez encore rien acheté.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mes ventes" }));

    expect(await screen.findByText("Vous n’avez encore rien vendu.")).toBeInTheDocument();
  });

  it("signale une session expirée", async () => {
    mockFetch(() => jsonResponse({}, 401));
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Session expirée");
  });

  it("signale un service indisponible", async () => {
    mockFetch(() => jsonResponse({}, 503));
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("momentanément indisponibles");
  });

  it("se ferme avec le bouton de fermeture", async () => {
    mockOrders([], []);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MyOrders onClose={onClose} />);

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("affiche l'étape de chaque commande", async () => {
    mockOrders([shippedOrder], []);
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByText("Expédiée")).toBeInTheDocument();
  });

  it("laisse le vendeur marquer une commande payée comme expédiée", async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url === "/api/orders/purchases") return jsonResponse([]);
      if (url === `/api/orders/${order.id}/ship` && init?.method === "POST") return jsonResponse(shippedOrder);
      return jsonResponse([order]);
    });
    const user = userEvent.setup();
    render(<MyOrders onClose={vi.fn()} />);
    await screen.findByText("Vous n’avez encore rien acheté.");
    await user.click(screen.getByRole("button", { name: "Mes ventes" }));
    expect(await screen.findByText("Payée, à expédier")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Marquer comme expédiée" }));

    expect(await screen.findByText("Expédiée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marquer comme expédiée" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(`/api/orders/${order.id}/ship`, expect.objectContaining({ method: "POST" }));
  });

  it("laisse l'acheteur confirmer la réception d'une commande expédiée", async () => {
    mockFetch((url, init) => {
      if (url === `/api/orders/${order.id}/deliver` && init?.method === "POST") {
        return jsonResponse({ ...shippedOrder, status: "DELIVERED" });
      }
      return jsonResponse([shippedOrder]);
    });
    const user = userEvent.setup();
    render(<MyOrders onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "J’ai reçu mon colis" }));

    expect(await screen.findByText("Reçue")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "J’ai reçu mon colis" })).toBeNull();
  });

  it("ne propose pas la mauvaise action à chaque rôle", async () => {
    mockOrders([order], [shippedOrder]);
    const user = userEvent.setup();
    render(<MyOrders onClose={vi.fn()} />);

    await screen.findByText("Payée, à expédier");
    expect(screen.queryByRole("button", { name: "Marquer comme expédiée" })).toBeNull();
    expect(screen.queryByRole("button", { name: "J’ai reçu mon colis" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Mes ventes" }));
    await screen.findByText("Expédiée");

    expect(screen.queryByRole("button", { name: "Marquer comme expédiée" })).toBeNull();
    expect(screen.queryByRole("button", { name: "J’ai reçu mon colis" })).toBeNull();
  });

  it("affiche l'erreur quand l'étape est refusée", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "POST") return jsonResponse({}, 409);
      return jsonResponse([shippedOrder]);
    });
    const user = userEvent.setup();
    render(<MyOrders onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "J’ai reçu mon colis" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("déjà changé d’étape");
    expect(screen.getByRole("button", { name: "J’ai reçu mon colis" })).toBeEnabled();
  });
});

describe("MyOrders - avis sur le vendeur", () => {
  const deliveredOrder = { ...order, status: "DELIVERED" as const, deliveredAt: "2026-11-19T09:00:00Z" };
  const written = {
    id: "r1",
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    rating: 4,
    comment: "Envoi soigné",
    createdAt: "2026-11-20T10:00:00Z",
  };

  function mockWithReviews(reviews: unknown[]) {
    return mockFetch((url, init) => {
      if (url === "/api/reviews/mine") return jsonResponse(reviews);
      if (url.endsWith("/review") && init?.method === "POST") return jsonResponse(written, 201);
      return url === "/api/orders/purchases" ? jsonResponse([deliveredOrder]) : jsonResponse([]);
    });
  }

  it("propose de noter le vendeur d'un achat reçu", async () => {
    mockWithReviews([]);
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByText("Notez le vendeur")).toBeInTheDocument();
  });

  it("affiche l'avis déjà donné au lieu du formulaire", async () => {
    mockWithReviews([written]);
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByText("Envoi soigné")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4,0 sur 5" })).toBeInTheDocument();
    expect(screen.queryByText("Notez le vendeur")).toBeNull();
  });

  it("remplace le formulaire par l'avis une fois publié", async () => {
    mockWithReviews([]);
    render(<MyOrders onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: "4 étoiles" }));
    await userEvent.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(await screen.findByText("Votre avis")).toBeInTheDocument();
    expect(screen.queryByText("Notez le vendeur")).toBeNull();
  });

  it("ne propose pas d'avis sur une commande pas encore reçue", async () => {
    mockOrders([shippedOrder], []);
    render(<MyOrders onClose={vi.fn()} />);

    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(screen.queryByText("Notez le vendeur")).toBeNull();
  });

  function mockSales(reviews: unknown[]) {
    return mockFetch((url) => {
      if (url === `/api/sellers/${order.sellerId}/reviews`) {
        return jsonResponse({
          sellerId: order.sellerId,
          average: 4,
          count: reviews.length,
          reviews,
        });
      }
      return url === "/api/orders/sales" ? jsonResponse([deliveredOrder]) : jsonResponse([]);
    });
  }

  it("montre au vendeur l'avis laissé sur sa vente", async () => {
    mockSales([written]);
    render(<MyOrders onClose={vi.fn()} />);
    await screen.findByText("Vous n’avez encore rien acheté.");

    await userEvent.click(screen.getByRole("button", { name: "Mes ventes" }));

    expect(await screen.findByText("Avis de l’acheteur")).toBeInTheDocument();
    expect(screen.getByText("Envoi soigné")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4,0 sur 5" })).toBeInTheDocument();
  });

  it("indique au vendeur qu'aucun avis n'a encore été laissé", async () => {
    mockSales([]);
    render(<MyOrders onClose={vi.fn()} />);
    await screen.findByText("Vous n’avez encore rien acheté.");

    await userEvent.click(screen.getByRole("button", { name: "Mes ventes" }));

    expect(await screen.findByText("Pas encore d’avis de l’acheteur.")).toBeInTheDocument();
  });

  it("ne propose pas de noter sa propre vente", async () => {
    mockWithReviews([]);
    render(<MyOrders onClose={vi.fn()} />);
    await screen.findByText("Notez le vendeur");

    mockFetch((url) => (url === "/api/orders/sales" ? jsonResponse([deliveredOrder]) : jsonResponse([deliveredOrder])));
    await userEvent.click(screen.getByRole("button", { name: "Mes ventes" }));
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(screen.queryByText("Notez le vendeur")).toBeNull();
  });

  it("télécharge le reçu PDF d'un achat avec le jeton", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) =>
      url.endsWith("/receipt")
        ? new Response("%PDF-1.4", { status: 200, headers: { "Content-Type": "application/pdf" } })
        : url === "/api/orders/purchases"
          ? jsonResponse([order])
          : jsonResponse([]),
    );
    const createObjectURL = vi.fn(() => "blob:recu");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<MyOrders onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "Télécharger le reçu (PDF)" }));

    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:recu"));
    expect(click).toHaveBeenCalled();
    const receiptCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/receipt"));
    expect(receiptCall?.[0]).toBe(`/api/orders/${order.id}/receipt`);
    expect(receiptCall?.[1]?.headers).toMatchObject({ Authorization: "Bearer jeton" });
  });

  it("n'offre pas le reçu dans « Mes ventes »", async () => {
    const user = userEvent.setup();
    mockOrders([], [order]);
    render(<MyOrders onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Mes ventes" }));
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(screen.queryByRole("button", { name: "Télécharger le reçu (PDF)" })).toBeNull();
  });
});
