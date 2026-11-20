import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../src/Pagination";

describe("Pagination", () => {
  it("n'affiche rien pour une seule page", () => {
    const { container } = render(<Pagination page={1} pages={1} onChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("indique la page courante et navigue", async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} pages={4} onChange={onChange} />);

    expect(screen.getByText("Page 2 sur 4")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Suivant/ }));
    expect(onChange).toHaveBeenLastCalledWith(3);

    await userEvent.click(screen.getByRole("button", { name: /Précédent/ }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("désactive les boutons aux extrémités", () => {
    const { rerender } = render(<Pagination page={1} pages={3} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Précédent/ })).toBeDisabled();

    rerender(<Pagination page={3} pages={3} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Suivant/ })).toBeDisabled();
  });
});
