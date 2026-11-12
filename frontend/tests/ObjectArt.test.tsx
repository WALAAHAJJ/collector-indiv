import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ObjectArt, { type ArtKind } from "../src/ObjectArt";

const kinds: ArtKind[] = ["stamps", "coins", "postcards", "other"];

describe("ObjectArt", () => {
  it.each(kinds)("dessine l’illustration %s", (kind) => {
    const { container } = render(<ObjectArt kind={kind} />);

    expect(container.querySelector(`svg[data-art="${kind}"]`)).not.toBeNull();
  });

  it("reste décorative quand elle n’a pas de titre", () => {
    const { container } = render(<ObjectArt kind="coins" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("est annoncée aux lecteurs d’écran quand elle a un titre", () => {
    render(<ObjectArt kind="stamps" title="Un timbre ancien" />);

    expect(screen.getByRole("img", { name: "Un timbre ancien" })).toBeInTheDocument();
  });

  it("applique la hauteur demandée", () => {
    const { container } = render(<ObjectArt kind="postcards" size={200} />);

    expect(container.querySelector("svg")).toHaveStyle({ height: "200px" });
  });
});
