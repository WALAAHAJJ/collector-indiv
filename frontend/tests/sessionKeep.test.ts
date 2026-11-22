import { beforeEach, describe, expect, it } from "vitest";
import { forgetSession, keepSession, KEEP_MS, loadSession } from "../src/sessionKeep";

beforeEach(() => sessionStorage.clear());

describe("sessionKeep", () => {
  it("redonne la session avant 5 minutes", () => {
    keepSession({ token: "t", refreshToken: "r" }, 1000);
    expect(loadSession(1000 + KEEP_MS - 1)).toEqual({ token: "t", refreshToken: "r", idToken: undefined });
  });

  it("l'oublie après 5 minutes", () => {
    keepSession({ token: "t", refreshToken: "r" }, 1000);
    expect(loadSession(1000 + KEEP_MS + 1)).toBeNull();
    expect(loadSession(1000)).toBeNull();
  });

  it("l'oublie à la déconnexion", () => {
    keepSession({ token: "t", refreshToken: "r" });
    forgetSession();
    expect(loadSession()).toBeNull();
  });

  it("ignore un contenu illisible", () => {
    sessionStorage.setItem("collector.session", "{pas du json");
    expect(loadSession()).toBeNull();
  });
});
