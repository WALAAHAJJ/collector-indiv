import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fallbackCategories } from "../src/categories";
import { setLanguage } from "../src/i18n";
import PurchaseDialog from "../src/PurchaseDialog";
import ReviewForm from "../src/ReviewForm";
import SellerPage from "../src/SellerPage";
import Stars from "../src/Stars";

const seller = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  setLanguage("fr");
  vi.unstubAllGlobals();
});

describe("traduction de la fiche, de l'achat et du vendeur", () => {
  it("affiche la page vendeur en anglais", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              url.includes("/reviews") ? { sellerId: seller, average: null, count: 0, reviews: [] } : [],
            ),
          ),
        ),
      ),
    );
    setLanguage("en");
    render(<SellerPage id={seller} categories={fallbackCategories} />);

    expect(screen.getByText("← Back to the catalogue")).toBeInTheDocument();
    expect(await screen.findByText("This seller has no listing for sale at the moment.")).toBeInTheDocument();
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Listings for sale" })).toBeInTheDocument();
  });

  it("affiche le formulaire de paiement et ses erreurs en anglais", async () => {
    setLanguage("en");
    const user = userEvent.setup();
    render(<PurchaseDialog listing={{ id: "x", title: "Stamps", price: 20, shippingCost: 3 }} onClose={vi.fn()} onPurchased={vi.fn()} />);

    expect(screen.getByText("Total to pay")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pay 23,00 €" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid card number: 13 to 19 digits.");
  });

  it("traduit le formulaire d'avis et les étoiles", async () => {
    setLanguage("en");
    const user = userEvent.setup();
    render(
      <>
        <ReviewForm orderId="o1" onSaved={vi.fn()} />
        <Stars value={4} />
      </>,
    );

    expect(screen.getByRole("img", { name: "4,0 out of 5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 star" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Post my review" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a rating from 1 to 5.");
  });
});
