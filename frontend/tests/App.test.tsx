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
  localStorage.clear();
  window.location.hash = "";
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
  detail?: () => Response;
  other?: (url: string, init?: RequestInit) => Response;
};

function mockApi(routes: Routes = {}) {
  return mockFetch((url, init) => {
    if (/^\/api\/collectibles\/catalog\/[0-9a-f-]{36}$/.test(url)) {
      return routes.detail?.() ?? jsonResponse(approvedListing);
    }

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
    expect(
      within(screen.getByRole("article")).getByText("Bon état"),
    ).toBeInTheDocument();
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

  it("ouvre la page de détail d'une annonce et revient au catalogue", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("link", { name: /Voir le détail/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "Lot de timbres" })).toBeInTheDocument();
    expect(screen.getByText("Série ancienne")).toBeInTheDocument();
    expect(screen.getByText("Frais d’expédition : 2,50 €")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "À découvrir" })).toBeNull();

    await user.click(screen.getByRole("link", { name: /Retour au catalogue/ }));

    expect(await screen.findByRole("heading", { name: "À découvrir" })).toBeInTheDocument();
  });

  it("ouvre directement une annonce depuis son adresse", async () => {
    window.location.hash = `#/annonce/${approvedListing.id}`;
    mockApi();
    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "Lot de timbres" })).toBeInTheDocument();
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

  it("range Mes annonces et Mes commandes dans le menu du compte, qui se ferme avec Échap", async () => {
    const user = userEvent.setup();
    setToken(fakeToken());
    mockApi();
    render(<App />);

    const toggle = await screen.findByRole("button", { name: /Bonjour, walaa/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
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
    await user.click(await screen.findByRole("link", { name: /Voir le détail/ }));
    await screen.findByRole("heading", { level: 1, name: "Lot de timbres" });
    return screen.getByRole("region", { name: "Lot de timbres" });
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

  it("confirme l'achat et recharge la fiche et le catalogue", async () => {
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

describe("App - tri, filtres et pagination du catalogue", () => {
  const many = Array.from({ length: 15 }, (_, index) => ({
    ...approvedListing,
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    name: `Objet ${String(index + 1).padStart(2, "0")}`,
    price: index + 1,
  }));

  it("découpe le catalogue en pages de 12 annonces", async () => {
    mockApi({ catalog: () => jsonResponse(many) });
    render(<App />);

    expect(await screen.findByText("Page 1 sur 2")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.getByText("15 annonces")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Suivant/ }));

    expect(screen.getByText("Page 2 sur 2")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("trie par prix décroissant", async () => {
    mockApi({ catalog: () => jsonResponse(many) });
    render(<App />);
    await screen.findByText("Page 1 sur 2");

    await userEvent.selectOptions(screen.getByLabelText("Trier par"), "price-desc");

    const first = screen.getAllByRole("article")[0];
    expect(within(first).getByRole("heading", { name: "Objet 15" })).toBeInTheDocument();
  });

  it("filtre par prix maximum et revient à la première page", async () => {
    mockApi({ catalog: () => jsonResponse(many) });
    render(<App />);
    await screen.findByText("Page 1 sur 2");
    await userEvent.click(screen.getByRole("button", { name: /Suivant/ }));

    await userEvent.type(screen.getByLabelText("Prix max (€)"), "3");

    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText("3 annonces")).toBeInTheDocument();
    expect(screen.queryByText(/Page \d sur/)).toBeNull();
  });

  it("indique quand aucun objet ne correspond aux filtres", async () => {
    mockApi({ catalog: () => jsonResponse(many) });
    render(<App />);
    await screen.findByText("Page 1 sur 2");

    await userEvent.type(screen.getByLabelText("Prix min (€)"), "500");

    expect(
      await screen.findByText("Aucun objet ne correspond à cette recherche."),
    ).toBeInTheDocument();
  });
});

describe("App - favoris", () => {
  it("ajoute et retire une annonce des favoris", async () => {
    mockApi();
    render(<App />);

    const add = await screen.findByRole("button", {
      name: "Ajouter Lot de timbres aux favoris",
    });
    await userEvent.click(add);

    const remove = screen.getByRole("button", {
      name: "Retirer Lot de timbres des favoris",
    });
    expect(remove).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("♡ Mes favoris (1)")).toBeInTheDocument();

    await userEvent.click(remove);

    expect(screen.getByText("♡ Mes favoris (0)")).toBeInTheDocument();
  });

  it("n'affiche que les favoris quand le filtre est actif", async () => {
    const other = { ...approvedListing, id: "33333333-3333-4333-8333-333333333333", name: "Autre objet" };
    mockApi({ catalog: () => jsonResponse([approvedListing, other]) });
    render(<App />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter Autre objet aux favoris" }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Mes favoris/ }));

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Autre objet" })).toBeInTheDocument();
  });

  it("explique quoi faire quand il n'y a pas encore de favori", async () => {
    mockApi();
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Mes favoris/ }));

    expect(screen.getByText(/pas encore de favori/)).toBeInTheDocument();
  });

  it("conserve les favoris après un rechargement de la page", async () => {
    mockApi();
    const first = render(<App />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter Lot de timbres aux favoris" }),
    );
    first.unmount();

    render(<App />);

    expect(
      await screen.findByRole("button", { name: "Retirer Lot de timbres des favoris" }),
    ).toBeInTheDocument();
  });
});

describe("App - pages d'information", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("propose les pages d'information dans l'en-tête et le pied de page", async () => {
    mockApi();
    render(<App />);
    await screen.findByRole("heading", { name: "Lot de timbres" });

    const header = within(screen.getByRole("navigation", { name: "Navigation principale" }));
    expect(header.getByRole("link", { name: "Comment ça marche" })).toHaveAttribute("href", "#/comment-ca-marche");
    expect(header.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "#/faq");

    const footer = within(screen.getByRole("navigation", { name: "Informations du site" }));
    expect(footer.getByRole("link", { name: "Conditions d'utilisation" })).toHaveAttribute("href", "#/cgu");
    expect(footer.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "#/contact");
  });

  it("ouvre une page d'information sans le catalogue, puis revient au catalogue", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/faq";
    mockApi();
    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "Questions fréquentes" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "À découvrir" })).toBeNull();
    expect(screen.getByRole("link", { name: "FAQ", current: "page" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Retour au catalogue/ }));

    expect(await screen.findByRole("heading", { name: "À découvrir" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catalogue", current: "page" })).toBeInTheDocument();
  });
});

describe("App - accueil", () => {
  it("résume le fonctionnement du site en trois étapes avec un lien vers le détail", async () => {
    mockApi();
    render(<App />);

    const steps = await screen.findByRole("region", { name: "Comment ça marche" });

    expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
    expect(within(steps).getByRole("link", { name: /Lire le mode d'emploi/ })).toHaveAttribute(
      "href",
      "#/comment-ca-marche",
    );
  });
});
