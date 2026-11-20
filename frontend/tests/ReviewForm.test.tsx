import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewForm from "../src/ReviewForm";
import Stars from "../src/Stars";
import { clearToken, setToken } from "../src/auth";
import { jsonResponse, mockFetch, ownerId } from "./helpers";

const orderId = "44444444-4444-4444-8444-444444444444";

beforeEach(() => setToken("jeton"));

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe("Stars", () => {
  it("décrit la note pour les lecteurs d'écran", () => {
    render(<Stars value={4.5} />);

    const stars = screen.getByRole("img", { name: "4,5 sur 5" });
    expect(stars).toHaveTextContent("★★★★★");
  });

  it("arrondit les étoiles pleines", () => {
    render(<Stars value={2.4} />);

    expect(screen.getByRole("img")).toHaveTextContent("★★☆☆☆");
  });
});

describe("ReviewForm", () => {
  it("demande une note avant d'envoyer", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}));
    render(<ReviewForm orderId={orderId} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choisissez une note de 1 à 5.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie la note choisie et le commentaire", async () => {
    const saved = { id: "r", orderId, buyerId: ownerId, sellerId: ownerId, rating: 5, comment: "Top", createdAt: "2026-11-20T10:00:00Z" };
    const fetchMock = mockFetch(() => jsonResponse(saved, 201));
    const onSaved = vi.fn();
    render(<ReviewForm orderId={orderId} onSaved={onSaved} />);

    await userEvent.click(screen.getByRole("button", { name: "5 étoiles" }));
    await userEvent.type(screen.getByLabelText(/Commentaire/), "Top");
    await userEvent.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ rating: 5, comment: "Top" });
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it("affiche l'erreur de l'API et permet de réessayer", async () => {
    mockFetch(() => new Response(null, { status: 409 }));
    render(<ReviewForm orderId={orderId} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "3 étoiles" }));
    await userEvent.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("déjà noté");
    expect(screen.getByRole("button", { name: "Publier mon avis" })).toBeEnabled();
  });
});
