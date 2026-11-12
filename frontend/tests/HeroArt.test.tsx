import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HeroArt from "../src/HeroArt";

describe("HeroArt", () => {
  it("montre trois polaroïds légendés", () => {
    render(<HeroArt />);

    expect(screen.getByText("timbres")).toBeInTheDocument();
    expect(screen.getByText("2 francs")).toBeInTheDocument();
    expect(screen.getByText("cartes de Paris")).toBeInTheDocument();
  });

  it("affiche la phrase d’accroche", () => {
    render(<HeroArt />);

    expect(
      screen.getByText("Trouvailles choisies avec passion"),
    ).toBeInTheDocument();
  });

  it("reste décoratif pour les lecteurs d’écran", () => {
    const { container } = render(<HeroArt />);

    expect(container.querySelector(".hero-art")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
