import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RegisterForm from "../src/RegisterForm";
import { jsonResponse, mockFetch } from "./helpers";

function setup() {
  const onClose = vi.fn();
  const onRegistered = vi.fn();

  render(<RegisterForm onClose={onClose} onRegistered={onRegistered} />);

  return { onClose, onRegistered, user: userEvent.setup() };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nom d.utilisateur/), "walaa");
  await user.type(screen.getByLabelText("Adresse e-mail"), "walaa@example.com");
  await user.type(screen.getByLabelText("Mot de passe"), "motdepasse123");
  await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
}

describe("RegisterForm", () => {
  it("envoie l’inscription puis prévient le parent", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, 201));
    const { onRegistered, user } = setup();

    await fillAndSubmit(user);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      username: "walaa",
      email: "walaa@example.com",
      password: "motdepasse123",
    });
    expect(onRegistered).toHaveBeenCalledOnce();
  });

  it("explique qu’un compte existe déjà", async () => {
    mockFetch(() => new Response(null, { status: 409 }));
    const { onRegistered, user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/déjà utilisé/);
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("explique les erreurs de validation", async () => {
    mockFetch(() => new Response(null, { status: 400 }));
    const { user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Vérifie les informations saisies/,
    );
  });

  it("signale un serveur injoignable", async () => {
    mockFetch(() => {
      throw new Error("hors ligne");
    });
    const { user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Impossible de contacter le serveur.",
    );
  });

  it("se ferme avec le bouton de fermeture", async () => {
    const { onClose, user } = setup();

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
