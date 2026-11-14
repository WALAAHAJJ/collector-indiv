import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { setToken } from "../src/auth";
import ListingForm from "../src/ListingForm";
import {
  approvedListing,
  defaultCategories,
  jsonResponse,
  mockFetch,
  ownerId,
} from "./helpers";

function setup(categories = defaultCategories) {
  const onClose = vi.fn();
  const onSubmitted = vi.fn();

  render(
    <ListingForm
      ownerId={ownerId}
      categories={categories}
      onClose={onClose}
      onSubmitted={onSubmitted}
    />,
  );

  return { onClose, onSubmitted, user: userEvent.setup() };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Titre de l.annonce/), "Pièce de 2 francs");
  await user.type(screen.getByLabelText("Description"), "Belle pièce ancienne");
  await user.selectOptions(screen.getByLabelText("Catégorie"), "Pièces");
  await user.selectOptions(screen.getByLabelText("État"), "very_good");
  await user.type(screen.getByLabelText(/Prix de l.objet/), "12");
  await user.click(screen.getByRole("button", { name: /Publier l.annonce/ }));
}

describe("ListingForm", () => {
  it("publie l’annonce avec le jeton de l’utilisatrice", async () => {
    setToken("jeton-123");
    const fetchMock = mockFetch(() => jsonResponse(approvedListing, 201));
    const { onSubmitted, user } = setup();

    await fillAndSubmit(user);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/collectibles");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer jeton-123" });
    expect(JSON.parse(String(init?.body))).toEqual({
      ownerId,
      name: "Pièce de 2 francs",
      category: "Pièces",
      description: "Belle pièce ancienne",
      price: 12,
      shippingCost: 0,
      condition: "VERY_GOOD",
    });
    expect(onSubmitted).toHaveBeenCalledOnce();
  });

  it("publie sans en-tête d’autorisation quand il n’y a pas de jeton", async () => {
    const fetchMock = mockFetch(() => jsonResponse(approvedListing, 201));
    const { user } = setup();

    await fillAndSubmit(user);

    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty(
      "Authorization",
    );
  });

  it("affiche le motif quand la modération refuse l’annonce", async () => {
    mockFetch(() =>
      jsonResponse(
        {
          ...approvedListing,
          status: "REJECTED",
          moderationReason: "Les coordonnées personnelles sont interdites.",
        },
        201,
      ),
    );
    const { onSubmitted, user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Les coordonnées personnelles sont interdites.",
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("affiche un message générique quand la modération ne donne pas de motif", async () => {
    mockFetch(() =>
      jsonResponse({ ...approvedListing, status: "REJECTED" }, 201),
    );
    const { user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /refusée par la modération automatique/,
    );
  });

  it("signale une erreur du serveur", async () => {
    mockFetch(() => new Response(null, { status: 400 }));
    const { onSubmitted, user } = setup();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /n.a pas pu être envoyée/,
    );
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("signale un serveur injoignable", async () => {
    mockFetch(() => {
      throw "panne";
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

  it("propose les catégories reçues de l’API", () => {
    setup([
      { id: "a", name: "Vinyles", art: "OTHER" },
      { id: "b", name: "Monnaies", art: "COINS" },
    ]);

    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent)
      .filter((text) => ["Vinyles", "Monnaies", "Timbres"].includes(text ?? ""));

    expect(options).toEqual(["Vinyles", "Monnaies"]);
    expect(screen.getByLabelText("Catégorie")).toHaveValue("Vinyles");
  });

  describe("photo", () => {
    const created = { ...approvedListing, id: "44444444-4444-4444-8444-444444444444" };

    function choosePhoto(file: File) {
      fireEvent.change(screen.getByLabelText("Photo (facultative)"), {
        target: { files: [file] },
      });
    }

    it("envoie la photo après la création de l’annonce", async () => {
      setToken("jeton-123");
      const fetchMock = mockFetch(() => jsonResponse(created, 201));
      const { onSubmitted, user } = setup();

      choosePhoto(new File([new Uint8Array(10)], "p.png", { type: "image/png" }));
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      await fillAndSubmit(user);

      await waitFor(() => expect(onSubmitted).toHaveBeenCalledOnce());
      expect(onSubmitted).toHaveBeenCalledWith();
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe(`/api/collectibles/${created.id}/photo`);
      expect(init?.method).toBe("POST");
      expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
    });

    it("n’appelle pas l’envoi de photo quand aucune n’est choisie", async () => {
      const fetchMock = mockFetch(() => jsonResponse(created, 201));
      const { user } = setup();

      await fillAndSubmit(user);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });

    it("refuse un format non pris en charge", async () => {
      mockFetch(() => jsonResponse(created, 201));
      setup();

      choosePhoto(new File([new Uint8Array(10)], "a.gif", { type: "image/gif" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Format non pris en charge");
    });

    it("oublie la photo quand on en retire le choix", async () => {
      const fetchMock = mockFetch(() => jsonResponse(created, 201));
      const { user } = setup();

      choosePhoto(new File([new Uint8Array(10)], "p.png", { type: "image/png" }));
      fireEvent.change(screen.getByLabelText("Photo (facultative)"), {
        target: { files: [] },
      });
      await fillAndSubmit(user);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });

    it("prévient quand la photo n’a pas pu être envoyée mais garde l’annonce", async () => {
      mockFetch((url) =>
        url.endsWith("/photo") ? jsonResponse({}, 413) : jsonResponse(created, 201),
      );
      const { onSubmitted, user } = setup();

      choosePhoto(new File([new Uint8Array(10)], "p.png", { type: "image/png" }));
      await fillAndSubmit(user);

      await waitFor(() => expect(onSubmitted).toHaveBeenCalledOnce());
      expect(onSubmitted.mock.calls[0][0]).toContain("la photo n’a pas été envoyée");
      expect(onSubmitted.mock.calls[0][0]).toContain("dépasse 1 Mo");
    });
  });
});
