import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getToken } from "../src/auth";
import LoginForm from "../src/LoginForm";
import { jsonResponse, mockFetch, ownerId } from "./helpers";

function setup() {
  const onClose = vi.fn();
  const onShowRegistration = vi.fn();
  const onLoggedIn = vi.fn();

  render(
    <LoginForm
      onClose={onClose}
      onShowRegistration={onShowRegistration}
      onLoggedIn={onLoggedIn}
    />,
  );

  return { onClose, onShowRegistration, onLoggedIn, user: userEvent.setup() };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nom d.utilisateur/), "walaa");
  await user.type(screen.getByLabelText("Mot de passe"), "motdepasse123");
  await user.click(screen.getByRole("button", { name: "Se connecter" }));
}

describe("LoginForm", () => {
  it("connecte l’utilisatrice et conserve le jeton", async () => {
    const loggedUser = {
      id: ownerId,
      username: "walaa",
      email: "w@x.fr",
      role: "USER",
    };
    const fetchMock = mockFetch(() =>
      jsonResponse({ accessToken: "jeton-123", user: loggedUser }),
    );
    const { onLoggedIn, user } = setup();

    await fillAndSubmit(user);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ username: "walaa", password: "motdepasse123" });
    expect(getToken()).toBe("jeton-123");
    expect(onLoggedIn).toHaveBeenCalledWith(loggedUser);
  });

  it("affiche un message quand les identifiants sont refusés", async () => {
    mockFetch(() => new Response(null, { status: 401 }));
    const { onLoggedIn, user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /mot de passe incorrect/,
    );
    expect(onLoggedIn).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it("affiche un message quand la réponse ne contient pas de jeton", async () => {
    mockFetch(() => jsonResponse({}));
    const { user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La connexion a échoué.",
    );
  });

  it("affiche l’erreur réseau", async () => {
    mockFetch(() => {
      throw new Error("Réseau coupé");
    });
    const { user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Réseau coupé");
  });

  it("propose de créer un compte et de fermer la fenêtre", async () => {
    const { onClose, onShowRegistration, user } = setup();

    await user.click(screen.getByRole("button", { name: "Créer un compte" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(onShowRegistration).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
