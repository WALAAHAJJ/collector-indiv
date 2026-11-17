import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatExpiry } from "../src/cardFormat";
import PurchaseDialog from "../src/PurchaseDialog";
import { clearToken, setToken } from "../src/auth";
import { jsonResponse, listingId, mockFetch } from "./helpers";

const listing = {
  id: listingId,
  title: "Lot de timbres",
  price: 20,
  shippingCost: 3,
};

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

async function fillCard(
  user: ReturnType<typeof userEvent.setup>,
  values: { number?: string; holder?: string; expiry?: string; cvc?: string } = {},
) {
  await user.type(
    screen.getByLabelText("Numéro de carte"),
    values.number ?? "4242 4242 4242 4242",
  );
  await user.type(screen.getByLabelText("Nom sur la carte"), values.holder ?? "Walaa Test");
  await user.type(screen.getByLabelText("Expiration"), values.expiry ?? "1240");
  await user.type(screen.getByLabelText("Code de sécurité"), values.cvc ?? "123");
}

describe("PurchaseDialog", () => {
  it("montre le détail du prix et le total à payer", () => {
    render(<PurchaseDialog listing={listing} onClose={vi.fn()} onPurchased={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Acheter" })).toBeInTheDocument();
    expect(screen.getByText("Lot de timbres")).toBeInTheDocument();
    expect(screen.getByText("Objet").nextSibling).toHaveTextContent("20,00 €");
    expect(screen.getByText("Expédition").nextSibling).toHaveTextContent("3,00 €");
    expect(screen.getByText("Total à payer").nextSibling).toHaveTextContent("23,00 €");
    expect(screen.getByRole("button", { name: "Payer 23,00 €" })).toBeInTheDocument();
  });

  it("explique que la commission est payée par le vendeur et donne la carte de test", () => {
    render(<PurchaseDialog listing={listing} onClose={vi.fn()} onPurchased={vi.fn()} />);

    expect(screen.getByText(/5 % de commission sur le vendeur/)).toBeInTheDocument();
    expect(screen.getByText(/4242 4242 4242 4242/, { selector: "p" })).toBeInTheDocument();
  });

  it("ajoute la barre oblique de la date pendant la saisie", async () => {
    const user = userEvent.setup();
    render(<PurchaseDialog listing={listing} onClose={vi.fn()} onPurchased={vi.fn()} />);

    await user.type(screen.getByLabelText("Expiration"), "1240");

    expect(screen.getByLabelText("Expiration")).toHaveValue("12/40");
  });

  it.each([
    [{ number: "abcd" }, "Numéro de carte invalide"],
    [{ holder: " " }, "nom inscrit sur la carte"],
    [{ expiry: "13" + "40" }, "Date d’expiration invalide"],
    [{ cvc: "1" }, "Code de sécurité invalide"],
  ])("refuse une saisie invalide sans rien envoyer (%j)", async (values, message) => {
    const fetchMock = mockFetch(() => jsonResponse(order, 201));
    const user = userEvent.setup();
    render(<PurchaseDialog listing={listing} onClose={vi.fn()} onPurchased={vi.fn()} />);

    await fillCard(user, values);
    await user.click(screen.getByRole("button", { name: "Payer 23,00 €" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie l'achat puis affiche le reçu", async () => {
    const fetchMock = mockFetch(() => jsonResponse(order, 201));
    const onPurchased = vi.fn();
    const user = userEvent.setup();
    render(<PurchaseDialog listing={listing} onClose={vi.fn()} onPurchased={onPurchased} />);

    await fillCard(user);
    await user.click(screen.getByRole("button", { name: "Payer 23,00 €" }));

    expect(await screen.findByRole("heading", { name: "Paiement accepté" })).toBeInTheDocument();
    expect(screen.getByText("Montant payé").nextSibling).toHaveTextContent("23,00 €");
    expect(screen.getByText("•••• 4242")).toBeInTheDocument();

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      listingId,
      cardNumber: "4242 4242 4242 4242",
      cardHolder: "Walaa Test",
      expiry: "12/40",
      cvc: "123",
    });

    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onPurchased).toHaveBeenCalledWith(order);
  });

  it("n'affiche plus le numéro de carte une fois le paiement accepté", async () => {
    mockFetch(() => jsonResponse(order, 201));
    const user = userEvent.setup();
    render(<PurchaseDialog listing={listing} onClose={vi.fn()} onPurchased={vi.fn()} />);

    await fillCard(user);
    await user.click(screen.getByRole("button", { name: "Payer 23,00 €" }));
    await screen.findByRole("heading", { name: "Paiement accepté" });

    expect(screen.queryByDisplayValue("4242 4242 4242 4242")).not.toBeInTheDocument();
    expect(screen.queryByText("4242 4242 4242 4242")).not.toBeInTheDocument();
  });

  it("garde le formulaire et explique le refus quand la carte est refusée", async () => {
    mockFetch(() => jsonResponse({}, 402));
    const onPurchased = vi.fn();
    const user = userEvent.setup();
    render(<PurchaseDialog listing={listing} onClose={vi.fn()} onPurchased={onPurchased} />);

    await fillCard(user, { number: "4000 0000 0000 0002" });
    await user.click(screen.getByRole("button", { name: "Payer 23,00 €" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Paiement refusé");
    expect(onPurchased).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Payer 23,00 €" })).toBeEnabled(),
    );
  });

  it("ferme la fenêtre avec le bouton de fermeture", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PurchaseDialog listing={listing} onClose={onClose} onPurchased={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe("formatExpiry", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["12", "12"],
    ["124", "12/4"],
    ["1240", "12/40"],
    ["12/40", "12/40"],
    ["12345", "12/34"],
    ["ab1c2", "12"],
  ])("transforme %j en %j", (raw, expected) => {
    expect(formatExpiry(raw)).toBe(expected);
  });
});
