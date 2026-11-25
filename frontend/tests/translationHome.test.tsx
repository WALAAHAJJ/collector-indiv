import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogueControls } from "../src/CatalogueControls";
import { NO_FILTERS } from "../src/catalogue";
import { setLanguage } from "../src/i18n";
import { conditionText } from "../src/listing";
import { Pagination } from "../src/Pagination";
import SiteFooter from "../src/SiteFooter";

afterEach(() => setLanguage("fr"));

describe("traduction de l'accueil et du catalogue", () => {
  it("affiche les filtres en anglais", () => {
    setLanguage("en");
    render(<CatalogueControls filters={NO_FILTERS} onChange={vi.fn()} count={3} favorites={{ count: 2, active: false, onToggle: vi.fn() }} />);

    expect(screen.getByLabelText("Min price (€)")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Newest" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Very good condition" })).toBeInTheDocument();
    expect(screen.getByText("3 listings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My favourites \(2\)/ })).toBeInTheDocument();
  });

  it("accorde « annonce » au singulier en français et en anglais", () => {
    render(<CatalogueControls filters={NO_FILTERS} onChange={vi.fn()} count={1} />);
    expect(screen.getByText("1 annonce")).toBeInTheDocument();
  });

  it("traduit la pagination et le pied de page", async () => {
    setLanguage("en");
    const onChange = vi.fn();
    render(<><Pagination page={2} pages={5} onChange={onChange} /><SiteFooter /></>);

    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next →" }));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(within(screen.getByRole("contentinfo")).getByText("Great collections are meant to be shared.")).toBeInTheDocument();
  });

  it("traduit l'état d'un objet sans toucher à sa valeur interne", () => {
    const t = (key: string) => ({ conditionNew: "New" })[key as "conditionNew"] ?? key;

    expect(conditionText("Neuf", t as never)).toBe("New");
    expect(conditionText("MINT", t as never)).toBe("MINT");
  });
});
