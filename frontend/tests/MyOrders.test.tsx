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
};

beforeEach(() => setToken("jeton"));

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

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
});
