import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListingForm from "../src/ListingForm";
import MyListings from "../src/MyListings";
import MyOrders from "../src/MyOrders";
import { clearToken, setToken } from "../src/auth";
import { setLanguage } from "../src/i18n";
import { purchaseErrorMessage, refundErrorMessage } from "../src/ordersApi";
import { photoProblem } from "../src/photoFile";
import { defaultCategories, jsonResponse, mockFetch, ownerId } from "./helpers";

const order = {
  id: "44444444-4444-4444-8444-444444444444",
  listingId: "22222222-2222-4222-8222-222222222222",
  listingName: "Stamps",
  buyerId: "55555555-5555-4555-8555-555555555555",
  sellerId: "66666666-6666-4666-8666-666666666666",
  itemPrice: 20,
  shippingCost: 3,
  commission: 1,
  buyerTotal: 23,
  sellerNet: 22,
  cardLast4: "4242",
  createdAt: "2026-11-17T10:00:00Z",
  status: "PAID",
  shippedAt: null,
  deliveredAt: null,
};

beforeEach(() => setToken("token"));

afterEach(() => {
  setLanguage("fr");
  vi.unstubAllGlobals();
  clearToken();
});

describe("traduction du compte", () => {
  it("affiche le formulaire d'annonce en anglais", () => {
    setLanguage("en");
    render(<ListingForm ownerId={ownerId} categories={defaultCategories} onClose={vi.fn()} onSubmitted={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Post a listing" })).toBeInTheDocument();
    expect(screen.getByLabelText("Listing title")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Very good condition" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish the listing" })).toBeInTheDocument();
  });

  it("affiche Mes commandes en anglais, étapes comprises", async () => {
    mockFetch((url) => (url === "/api/orders/purchases" ? jsonResponse([order]) : jsonResponse([])));
    setLanguage("en");
    render(<MyOrders onClose={vi.fn()} />);

    expect(await screen.findByText("Paid, to be shipped")).toBeInTheDocument();
    expect(screen.getByText("Total paid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My sales" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download the receipt (PDF)" })).toBeInTheDocument();
  });

  it("affiche Mes annonces en anglais", async () => {
    mockFetch(() => jsonResponse([]));
    setLanguage("en");
    render(<MyListings ownerId={ownerId} categories={defaultCategories} onClose={vi.fn()} />);

    expect(await screen.findByText("You have not posted a listing yet.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My listings" })).toBeInTheDocument();
  });

  it("traduit les messages d'erreur des appels à l'API", () => {
    setLanguage("en");

    expect(purchaseErrorMessage(409)).toBe("This listing has just been sold.");
    expect(refundErrorMessage(403)).toBe("Access reserved for administrators.");
    expect(photoProblem(new File(["x"], "a.gif", { type: "image/gif" }))).toBe(
      "Unsupported format: choose a JPEG, PNG or WebP photo.",
    );
  });
});
