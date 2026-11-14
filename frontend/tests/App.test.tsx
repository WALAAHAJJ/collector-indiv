import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import { getToken, setToken } from "../src/auth";
import {
  approvedListing,
  defaultCategories,
  jsonResponse,
  mockFetch,
  ownerId,
} from "./helpers";

const sessionUser = {
  id: ownerId,
  username: "walaa",
  email: "walaa@example.com",
  role: "USER",
};

type Routes = {
  categories?: () => Response;
  catalog?: () => Response;
  me?: () => Response;
  other?: (url: string, init?: RequestInit) => Response;
};

function mockApi(routes: Routes = {}) {
  return mockFetch((url, init) => {
    if (url.startsWith("/api/collectibles/catalog")) {
      return routes.catalog?.() ?? jsonResponse([approvedListing]);
    }

    if (url === "/api/categories") {
      return routes.categories?.() ?? jsonResponse(defaultCategories);
    }

    if (url === "/api/auth/me") {
      return routes.me?.() ?? jsonResponse(sessionUser);
    }

    return routes.other?.(url, init) ?? jsonResponse([]);
  });
}

describe("App - catalogue", () => {
  it("affiche les annonces approuvées", async () => {
    mockApi();
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Lot de timbres" }),
    ).toBeInTheDocument();
    expect(screen.getByText("18,50 €")).toBeInTheDocument();
    expect(screen.getByText("Expédition : 2,50 €")).toBeInTheDocument();
    expect(screen.getByText("Bon état")).toBeInTheDocument();
  });

  it("affiche un message quand le catalogue est vide", async () => {
    mockApi({ catalog: () => jsonResponse([]) });
    render(<App />);

    expect(
      await screen.findByText("Aucune annonce approuvée pour le moment."),
    ).toBeInTheDocument();
  });

  it("affiche un message quand le catalogue est indisponible", async () => {
    mockApi({ catalog: () => new Response(null, { status: 500 }) });
    render(<App />);

    expect(
      await screen.findByText("Le catalogue est momentanément indisponible."),
    ).toBeInTheDocument();
  });

  it("filtre par catégorie côté serveur", async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    await user.click(screen.getByRole("button", { name: "Timbres" }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
        "/api/collectibles/catalog?category=Timbres",
      ),
    );
  });

  it("construit les filtres avec les catégories de l’API", async () => {
    mockApi({
      categories: () =>
        jsonResponse([{ id: "v", name: "Vinyles", art: "OTHER" }]),
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(
      await screen.findByRole("button", { name: "Vinyles" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Timbres" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tout" })).toBeInTheDocument();
  });

  it("garde les filtres par défaut si l’API des catégories est en panne", async () => {
    mockApi({ categories: () => new Response(null, { status: 500 }) });
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(screen.getByRole("button", { name: "Timbres" })).toBeInTheDocument();
  });

  it("recherche un objet par son nom", async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    await user.type(screen.getByLabelText("Rechercher un objet"), "timbre");

    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
        "/api/collectibles/catalog?search=timbre",
      ),
    );
  });

  it("indique quand aucun objet ne correspond à la recherche", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    await user.type(screen.getByLabelText("Rechercher un objet"), "zzz");

    expect(
      await screen.findByText("Aucun objet ne correspond à cette recherche."),
    ).toBeInTheDocument();
  });

  it("ouvre le détail d’une annonce et le ferme avec Échap", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Voir le détail/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Série ancienne")).toBeInTheDocument();
    expect(within(dialog).getByText("Frais d’expédition : 2,50 €")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("affiche une description par défaut quand elle est vide", async () => {
    mockApi({
      catalog: () => jsonResponse([{ ...approvedListing, description: null }]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Voir le détail/ }));

    expect(screen.getByText("Aucune description renseignée.")).toBeInTheDocument();
  });
});

describe("App - compte", () => {
  it("propose de se connecter ou de créer un compte aux visiteurs", async () => {
    mockApi();
    render(<App />);

    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer un compte" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mes annonces" })).not.toBeInTheDocument();
    await screen.findByRole("heading", { name: "Lot de timbres" });
  });

  it("retrouve la session grâce au jeton conservé", async () => {
    setToken("jeton-123");
    const fetchMock = mockApi();
    render(<App />);

    expect(await screen.findByText("Bonjour, walaa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes annonces" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", {
      headers: { Authorization: "Bearer jeton-123" },
    });
  });

  it("efface un jeton refusé par le serveur", async () => {
    setToken("jeton-perime");
    mockApi({ me: () => new Response(null, { status: 401 }) });
    render(<App />);

    await waitFor(() => expect(getToken()).toBeNull());
    expect(screen.queryByText(/Bonjour/)).not.toBeInTheDocument();
  });

  it("reste utilisable quand la session ne peut pas être vérifiée", async () => {
    setToken("jeton-123");
    mockApi({ me: () => new Response(null, { status: 500 }) });
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Lot de timbres" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Bonjour/)).not.toBeInTheDocument();
  });

  it("déconnecte l’utilisatrice", async () => {
    setToken("jeton-123");
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Se déconnecter" }));

    expect(getToken()).toBeNull();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Vous êtes déconnectée.");
  });

  it("connecte l’utilisatrice depuis la fenêtre de connexion", async () => {
    mockApi({
      other: (url) =>
        url === "/api/auth/login"
          ? jsonResponse({ accessToken: "jeton-neuf", user: sessionUser })
          : jsonResponse([]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Nom d.utilisateur/), "walaa");
    await user.type(within(dialog).getByLabelText("Mot de passe"), "motdepasse123");
    await user.click(within(dialog).getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Bonjour, walaa")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Bienvenue, walaa !");
    expect(getToken()).toBe("jeton-neuf");
  });

  it("passe de l’inscription à la connexion une fois le compte créé", async () => {
    mockApi({
      other: (url) =>
        url === "/api/auth/register" ? jsonResponse({}, 201) : jsonResponse([]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Créer un compte" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Nom d.utilisateur/), "walaa");
    await user.type(within(dialog).getByLabelText("Adresse e-mail"), "walaa@example.com");
    await user.type(within(dialog).getByLabelText("Mot de passe"), "motdepasse123");
    await user.click(within(dialog).getByRole("button", { name: "Créer mon compte" }));

    expect(
      await screen.findByRole("heading", { name: "Se connecter" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Compte créé/);
  });

  it("bascule de la connexion à l’inscription", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Créer un compte" }));

    expect(
      await screen.findByRole("heading", { name: "Créer un compte" }),
    ).toBeInTheDocument();
  });
});

describe("App - espace vendeuse", () => {
  it("n’affiche pas le bouton d’administration à un compte ordinaire", async () => {
    setToken("jeton-123");
    mockApi();
    render(<App />);

    await screen.findByRole("button", { name: "Mes annonces" });

    expect(screen.queryByRole("button", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("ouvre le panneau d’administration pour un administrateur", async () => {
    setToken("jeton-admin");
    mockApi({
      me: () => jsonResponse({ ...sessionUser, role: "ADMIN" }),
      other: () => jsonResponse([]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Administration" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Administration" }),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByText("Aucune annonce en attente de vérification."),
    ).toBeInTheDocument();
  });

  it("ferme le panneau d’administration à la déconnexion", async () => {
    setToken("jeton-admin");
    mockApi({
      me: () => jsonResponse({ ...sessionUser, role: "ADMIN" }),
      other: () => jsonResponse([]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Administration" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ouvre la liste de mes annonces", async () => {
    setToken("jeton-123");
    mockApi({ other: () => jsonResponse([approvedListing]) });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Mes annonces" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("heading", { name: "Mes annonces" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Approuvée")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Fermer" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dépose une annonce et confirme l’enregistrement", async () => {
    setToken("jeton-123");
    mockApi({
      other: (url, init) =>
        url === "/api/collectibles" && init?.method === "POST"
          ? jsonResponse(approvedListing, 201)
          : jsonResponse([]),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /Déposer une annonce/ }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Titre de l.annonce/), "Lot de timbres");
    await user.type(within(dialog).getByLabelText("Description"), "Série ancienne");
    await user.type(within(dialog).getByLabelText(/Prix de l.objet/), "18.5");
    await user.click(within(dialog).getByRole("button", { name: /Publier l.annonce/ }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /Annonce enregistrée/,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
