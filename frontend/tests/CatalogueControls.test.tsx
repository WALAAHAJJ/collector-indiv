import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogueControls } from "../src/CatalogueControls";
import { NO_FILTERS } from "../src/catalogue";

describe("CatalogueControls", () => {
  it("affiche le nombre d'annonces avec l'accord du pluriel", () => {
    const { rerender } = render(
      <CatalogueControls filters={NO_FILTERS} onChange={vi.fn()} count={1} />,
    );

    expect(screen.getByText("1 annonce")).toBeInTheDocument();

    rerender(<CatalogueControls filters={NO_FILTERS} onChange={vi.fn()} count={5} />);

    expect(screen.getByText("5 annonces")).toBeInTheDocument();
  });

  it("transmet la borne de prix saisie", async () => {
    const onChange = vi.fn();
    render(<CatalogueControls filters={NO_FILTERS} onChange={onChange} count={3} />);

    await userEvent.type(screen.getByLabelText("Prix max (€)"), "5");

    expect(onChange).toHaveBeenLastCalledWith({ ...NO_FILTERS, maxPrice: "5" });
  });

  it("transmet l'état et le tri choisis", async () => {
    const onChange = vi.fn();
    render(<CatalogueControls filters={NO_FILTERS} onChange={onChange} count={3} />);

    await userEvent.selectOptions(screen.getByLabelText("État"), "Neuf");
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_FILTERS, condition: "Neuf" });

    await userEvent.selectOptions(screen.getByLabelText("Trier par"), "price-asc");
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_FILTERS, sort: "price-asc" });
  });

  it("propose de réinitialiser seulement quand un filtre est actif", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CatalogueControls filters={NO_FILTERS} onChange={onChange} count={3} />,
    );

    expect(screen.queryByRole("button", { name: "Réinitialiser" })).toBeNull();

    rerender(
      <CatalogueControls
        filters={{ ...NO_FILTERS, condition: "Neuf" }}
        onChange={onChange}
        count={3}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(onChange).toHaveBeenCalledWith(NO_FILTERS);
  });
});
