import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Modal from "../src/Modal";

function setup() {
  const onClose = vi.fn();

  render(
    <Modal
      onClose={onClose}
      titleId="titre-test"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal"
    >
      <h2 id="titre-test">Ma fenêtre</h2>
      <button type="button">Action</button>
    </Modal>,
  );

  return { onClose, user: userEvent.setup() };
}

describe("Modal", () => {
  it("affiche une boîte de dialogue nommée par son titre", () => {
    setup();

    expect(
      screen.getByRole("dialog", { name: "Ma fenêtre" }),
    ).toBeInTheDocument();
  });

  it("se ferme avec la touche Échap", async () => {
    const { onClose, user } = setup();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ignore les autres touches", async () => {
    const { onClose, user } = setup();

    await user.keyboard("a{Enter}");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("se ferme quand on clique à l’extérieur", async () => {
    const { onClose, user } = setup();

    await user.click(
      screen.getByRole("button", { name: /Fermer en cliquant à l.extérieur/ }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("reste ouverte quand on clique dans la fenêtre", async () => {
    const { onClose, user } = setup();

    await user.click(screen.getByRole("button", { name: "Action" }));
    await user.click(screen.getByRole("heading", { name: "Ma fenêtre" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("n’ajoute pas le bouton d’arrière-plan à l’ordre de tabulation", async () => {
    const { user } = setup();

    await user.tab();

    expect(screen.getByRole("button", { name: "Action" })).toHaveFocus();
  });
});
