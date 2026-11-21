import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminOrders from "../src/AdminOrders";
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
  refundedAt: null,
  paymentId: "77777777-7777-4777-8777-777777777777",
};

beforeEach(() => {
  setToken("jeton-admin");
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearToken();
});

describe("AdminOrders", () => {
  it("liste les commandes avec le jeton de l'administrateur", async () => {
    const fetchMock = mockFetch(() => jsonResponse([order]));
    render(<AdminOrders />);

    expect(await screen.findByRole("heading", { name: "Lot de timbres" })).toBeInTheDocument();
    expect(screen.getByText("Payée, à expédier")).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/orders");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer jeton-admin" });
  });

  it("rembourse une commande puis affiche son nouvel état", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((_url, init) =>
      init?.method === "POST"
        ? jsonResponse({ ...order, status: "REFUNDED", refundedAt: "2026-11-20T10:00:00Z" })
        : jsonResponse([order]),
    );
    render(<AdminOrders />);

    await user.click(await screen.findByRole("button", { name: "Rembourser" }));

    expect(await screen.findByText("Remboursée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rembourser" })).toBeNull();
    expect(screen.getByText("Commande remboursée.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/orders/${order.id}/refund`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("n'offre pas de remboursement quand la commande n'a pas de paiement", async () => {
    mockFetch(() => jsonResponse([{ ...order, paymentId: null }]));
    render(<AdminOrders />);

    await screen.findByRole("heading", { name: "Lot de timbres" });
    expect(screen.queryByRole("button", { name: "Rembourser" })).toBeNull();
  });

  it("affiche l'erreur quand le remboursement échoue", async () => {
    const user = userEvent.setup();
    mockFetch((_url, init) =>
      init?.method === "POST" ? jsonResponse({}, 503) : jsonResponse([order]),
    );
    render(<AdminOrders />);

    await user.click(await screen.findByRole("button", { name: "Rembourser" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("momentanément indisponible");
  });
});
