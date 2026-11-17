import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { clearToken, getToken, setToken } from "../src/auth";
import {
  approvedListing,
  defaultCategories,
  fakeToken,
  jsonResponse,
  mockFetch,
} from "./helpers";

const identity = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../src/identity", () => identity);

beforeEach(() => {
  identity.login.mockReset().mockResolvedValue(undefined);
  identity.register.mockReset().mockResolvedValue(undefined);
  identity.logout.mockReset().mockImplementation(() => {
    clearToken();
    return Promise.resolve();
  });
});

const adminToken = () => fakeToken({ roles: ["default-roles-collector", "ADMIN"] });

type Routes = {
  categories?: () => Response;
  catalog?: () => Response;
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

  it("affiche la photo d’une annonce qui en a une", async () => {
    mockApi({
      catalog: () => jsonResponse([{ ...approvedListing, hasPhoto: true }]),
    });
    render(<App />);

    const photo = await screen.findByRole("img", { name: "Lot de timbres" });

    expect(photo).toHaveAttribute("src", `/api/collectibles/${approvedListing.id}/photo`);
  });

  it("garde l’illustration pour une annonce sans photo", async () => {
    mockApi({
      catalog: () => jsonResponse([{ ...approvedListing, hasPhoto: false }]),
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(screen.queryByRole("img", { name: "Lot de timbres" })).toBeNull();
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

  it("reconnaît la personne grâce au jeton de Keycloak", async () => {
    setToken(fakeToken());
    mockApi();
    render(<App />);

    expect(await screen.findByText("Bonjour, walaa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes annonces" })).toBeInTheDocument();
  });

  it("affiche la cloche des notifications pour une personne connectée", async () => {
    setToken(fakeToken());
    mockApi({
      other: (url) =>
        url === "/api/notifications/unread-count"
          ? jsonResponse({ count: 2 })
          : jsonResponse([]),
    });
    render(<App />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 2 non lues" }),
    ).toBeInTheDocument();
  });

  it("n’affiche pas la cloche aux visiteurs", async () => {
    mockApi();
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(
      screen.queryByRole("button", { name: /Notifications/ }),
    ).not.toBeInTheDocument();
  });

  it("affiche l’identité dès que Keycloak fournit le jeton", async () => {
    mockApi();
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    act(() => setToken(fakeToken()));

    expect(await screen.findByText("Bonjour, walaa")).toBeInTheDocument();
  });

  it("repasse en visiteur quand le jeton disparaît", async () => {
    setToken(fakeToken());
    mockApi();
    render(<App />);
    await screen.findByText("Bonjour, walaa");

    act(() => clearToken());

    expect(screen.queryByText(/Bonjour/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("envoie vers Keycloak pour se connecter", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(identity.login).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("envoie vers Keycloak pour créer un compte", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Créer un compte" }));

    expect(identity.register).toHaveBeenCalledOnce();
  });

  it("déconnecte la personne par Keycloak", async () => {
    setToken(fakeToken());
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Se déconnecter" }));

    expect(identity.logout).toHaveBeenCalledOnce();
    expect(getToken()).toBeNull();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });
});

describe("App - espace vendeuse", () => {
  it("n’affiche pas le bouton d’administration à un compte ordinaire", async () => {
    setToken(fakeToken());
    mockApi();
    render(<App />);

    await screen.findByRole("button", { name: "Mes annonces" });

    expect(screen.queryByRole("button", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("ouvre le panneau d’administration pour un administrateur", async () => {
    setToken(adminToken());
    mockApi({
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

  it("fait apparaître une catégorie créée par l’administrateur dans les filtres", async () => {
    setToken(adminToken());
    let categories = [...defaultCategories];
    mockApi({
      categories: () => jsonResponse(categories),
      other: (url, init) => {
        if (url === "/api/admin/categories" && init?.method === "POST") {
          categories = [
            ...categories,
            { id: "v", name: "Vinyles", art: "OTHER" },
          ];
          return jsonResponse(categories[categories.length - 1], 201);
        }

        return jsonResponse([]);
      },
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Administration" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Catégories" }));
    await user.type(
      within(dialog).getByLabelText("Nom de la catégorie"),
      "Vinyles",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Ajouter la catégorie" }),
    );

    expect(
      await within(dialog).findByText("Catégorie « Vinyles » créée."),
    ).toBeInTheDocument();
    expect(await within(dialog).findByText("Vinyles")).toBeInTheDocument();
  });

  it("ferme le panneau d’administration à la déconnexion", async () => {
    setToken(adminToken());
    mockApi({
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
    setToken(fakeToken());
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
    setToken(fakeToken());
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

describe("App - achat", () => {
  const buyerId = "77777777-7777-4777-8777-777777777777";

  const order = {
    id: "44444444-4444-4444-8444-444444444444",
    listingId: approvedListing.id,
    listingName: "Lot de timbres",
    buyerId,
    sellerId: approvedListing.ownerId,
    itemPrice: 18.5,
    shippingCost: 2.5,
    commission: 0.93,
    buyerTotal: 21,
    sellerNet: 20.07,
    cardLast4: "4242",
    createdAt: "2026-11-17T10:00:00Z",
    status: "PAID" as const,
    shippedAt: null,
    deliveredAt: null,
  };

  async function openDetail(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: /Voir le détail/ }));
    return screen.getByRole("dialog");
  }

  it("propose la connexion à un visiteur", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    const dialog = await openDetail(user);
    await user.click(within(dialog).getByRole("button", { name: "Se connecter pour acheter" }));

    expect(identity.login).toHaveBeenCalled();
    expect(within(dialog).queryByRole("button", { name: "Acheter" })).toBeNull();
  });

  it("ne propose pas au vendeur d'acheter sa propre annonce", async () => {
    mockApi();
    setToken(fakeToken({ sub: approvedListing.ownerId }));
    const user = userEvent.setup();
    render(<App />);

    const dialog = await openDetail(user);

    expect(within(dialog).getByText("C’est votre annonce.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Acheter" })).toBeNull();
  });

  it("ouvre la fenêtre de paiement pour un autre utilisateur", async () => {
    mockApi();
    setToken(fakeToken({ sub: buyerId }));
    const user = userEvent.setup();
    render(<App />);

    const dialog = await openDetail(user);
    await user.click(within(dialog).getByRole("button", { name: "Acheter" }));

    expect(await screen.findByRole("button", { name: "Payer 21,00 €" })).toBeInTheDocument();
  });

  it("confirme l'achat, ferme le détail et recharge le catalogue", async () => {
    let catalogCalls = 0;
    mockApi({
      catalog: () => {
        catalogCalls += 1;
        return jsonResponse(catalogCalls === 1 ? [approvedListing] : []);
      },
      other: (url, init) =>
        url === "/api/orders" && init?.method === "POST"
          ? jsonResponse(order, 201)
          : jsonResponse([]),
    });
    setToken(fakeToken({ sub: buyerId }));
    const user = userEvent.setup();
    render(<App />);

    const dialog = await openDetail(user);
    await user.click(within(dialog).getByRole("button", { name: "Acheter" }));
    await user.type(screen.getByLabelText("Numéro de carte"), "4242 4242 4242 4242");
    await user.type(screen.getByLabelText("Nom sur la carte"), "Walaa Test");
    await user.type(screen.getByLabelText("Expiration"), "1240");
    await user.type(screen.getByLabelText("Code de sécurité"), "123");
    await user.click(screen.getByRole("button", { name: "Payer 21,00 €" }));
    await screen.findByRole("heading", { name: "Paiement accepté" });
    // le reçu est la fenêtre la plus récente : son bouton « Fermer » est le dernier de la page
    await user.click(screen.getAllByRole("button", { name: "Fermer" }).at(-1)!);

    expect(await screen.findByText(/Achat confirmé/)).toHaveTextContent("21,00 € payés");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Aucune annonce approuvée pour le moment.")).toBeInTheDocument();
  });

  it("ouvre « Mes commandes » pour un utilisateur connecté", async () => {
    mockApi();
    setToken(fakeToken({ sub: buyerId }));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Mes commandes" }));

    expect(await screen.findByRole("heading", { name: "Mes commandes" })).toBeInTheDocument();
  });

  it("ne montre pas « Mes commandes » à un visiteur", async () => {
    mockApi();
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    expect(screen.queryByRole("button", { name: "Mes commandes" })).toBeNull();
  });
});
