import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InfoPage from "../src/InfoPage";
import { CONTACT_EMAIL, INFO_PAGE_CONTENT } from "../src/infoPages";
import { INFO_PAGES } from "../src/route";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("InfoPage", () => {
  it.each(INFO_PAGES)("affiche le titre et le texte d'introduction de %s", (slug) => {
    const page = INFO_PAGE_CONTENT[slug];
    render(<InfoPage slug={slug} />);

    expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeInTheDocument();
    expect(screen.getByText(page.intro)).toBeInTheDocument();
  });

  it.each(INFO_PAGES)("renvoie vers le catalogue depuis %s", (slug) => {
    render(<InfoPage slug={slug} />);

    expect(screen.getByRole("link", { name: /Retour au catalogue/ })).toHaveAttribute("href", "#catalogue");
  });

  it("explique l'achat et la vente en étapes numérotées", () => {
    render(<InfoPage slug="comment-ca-marche" />);

    const buying = screen.getByRole("heading", { name: "Pour acheter" }).closest("section") as HTMLElement;
    expect(within(buying).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("heading", { name: "Pour vendre" })).toBeInTheDocument();
    expect(screen.getByText(/L'acheteur paie 23,00 €/)).toBeInTheDocument();
  });

  it("présente la FAQ sous forme de questions que l'on déplie", async () => {
    const user = userEvent.setup();
    render(<InfoPage slug="faq" />);

    const question = screen.getByText("Le paiement est-il réel ?").closest("details") as HTMLDetailsElement;
    expect(question.open).toBe(false);

    await user.click(screen.getByText("Le paiement est-il réel ?"));

    expect(question.open).toBe(true);
    expect(within(question).getByText(/4242 4242 4242 4242/)).toBeInTheDocument();
  });

  it("numérote les articles des conditions d'utilisation", () => {
    render(<InfoPage slug="cgu" />);

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(INFO_PAGE_CONTENT.cgu.sections.length);
    expect(screen.getByRole("heading", { name: "5. Paiement" })).toBeInTheDocument();
  });

  it("indique l'adresse de contact", () => {
    render(<InfoPage slug="contact" />);

    expect(screen.getByText(new RegExp(CONTACT_EMAIL))).toBeInTheDocument();
  });

  it("remonte en haut de la page et met à jour le titre de l'onglet", () => {
    render(<InfoPage slug="faq" />);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
    expect(document.title).toBe("Questions fréquentes – Collector");
  });

  it("rend son titre à l'onglet quand on quitte la page", () => {
    document.title = "Collector – objets de collection";
    const { unmount } = render(<InfoPage slug="faq" />);

    unmount();

    expect(document.title).toBe("Collector – objets de collection");
  });
});
