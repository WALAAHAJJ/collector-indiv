import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SellerPage from "../src/SellerPage";
import { fallbackCategories } from "../src/categories";

const seller = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";

function item(id: string, owner: string, name: string, status = "APPROVED") {
  return {
    id,
    ownerId: owner,
    name,
    category: "Timbres",
    description: "x",
    price: 12,
    shippingCost: 2,
    condition: "GOOD",
    status,
    hasPhoto: false,
  };
}

function mockApi(catalog: unknown[], reviews: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/reviews")) {
        return Promise.resolve(new Response(JSON.stringify(reviews)));
      }

      return Promise.resolve(new Response(JSON.stringify(catalog)));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SellerPage", () => {
  it("affiche les annonces de ce vendeur seulement, avec sa note et ses avis", async () => {
    mockApi(
      [
        item("22222222-2222-4222-8222-222222222222", seller, "Album de timbres"),
        item("33333333-3333-4333-8333-333333333333", other, "Pièce d'un autre"),
        item("44444444-4444-4444-8444-444444444444", seller, "Lot vendu", "SOLD"),
      ],
      {
        sellerId: seller,
        average: 4.5,
        count: 2,
        reviews: [
          {
            id: "r1",
            orderId: "o1",
            buyerId: other,
            sellerId: seller,
            rating: 5,
            comment: "Colis soigné",
            createdAt: "2026-11-01T10:00:00Z",
          },
        ],
      },
    );

    render(<SellerPage id={seller} categories={fallbackCategories} />);

    expect(await screen.findByText("Album de timbres")).toBeInTheDocument();
    expect(screen.queryByText("Pièce d'un autre")).not.toBeInTheDocument();
    expect(screen.queryByText("Lot vendu")).not.toBeInTheDocument();
    expect(await screen.findByText(/1 annonce en vente · 1 vendue/)).toBeInTheDocument();
    expect(await screen.findByText(/4,5 \(2 avis\)/)).toBeInTheDocument();
    expect(await screen.findByText("Colis soigné")).toBeInTheDocument();
  });

  it("dit quand le vendeur n'a rien en vente", async () => {
    mockApi([item("33333333-3333-4333-8333-333333333333", other, "Autre")], { sellerId: seller, average: null, count: 0, reviews: [] });

    render(<SellerPage id={seller} categories={fallbackCategories} />);

    expect(await screen.findByText(/aucune annonce en vente/)).toBeInTheDocument();
    expect(screen.getByText("Pas encore d’avis.")).toBeInTheDocument();
  });

  it("signale une panne du catalogue", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("", { status: 500 }))));

    render(<SellerPage id={seller} categories={fallbackCategories} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("momentanément indisponibles");
  });
});
