import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearToken,
  getToken,
  setToken,
  subscribe,
  userFromToken,
} from "../src/auth";
import { fakeToken, ownerId } from "./helpers";

afterEach(() => {
  clearToken();
});

describe("jeton en mémoire", () => {
  it("n’a pas de jeton au départ", () => {
    expect(getToken()).toBeNull();
  });

  it("enregistre puis relit le jeton", () => {
    setToken("jeton-test");

    expect(getToken()).toBe("jeton-test");
  });

  it("efface le jeton", () => {
    setToken("jeton-test");
    clearToken();

    expect(getToken()).toBeNull();
  });

  it("ne confie jamais le jeton au stockage du navigateur", () => {
    setToken("jeton-test");

    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it("prévient les abonnés à chaque changement, puis plus après désabonnement", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setToken("a");
    clearToken();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setToken("b");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("userFromToken", () => {
  it("lit l’identité d’un jeton Keycloak", () => {
    expect(userFromToken(fakeToken())).toEqual({
      id: ownerId,
      username: "walaa",
      email: "walaa@example.com",
      role: "USER",
    });
  });

  it("reconnaît le rôle ADMIN du realm", () => {
    const token = fakeToken({ roles: ["default-roles-collector", "ADMIN"] });

    expect(userFromToken(token)?.role).toBe("ADMIN");
  });

  it("garde les accents du nom d’utilisateur", () => {
    expect(userFromToken(fakeToken({ preferred_username: "hélène" }))?.username).toBe(
      "hélène",
    );
  });

  it("renvoie null sans jeton", () => {
    expect(userFromToken(null)).toBeNull();
  });

  it("renvoie null pour un jeton illisible", () => {
    expect(userFromToken("pas-un-jeton")).toBeNull();
    expect(userFromToken("a.%%%.c")).toBeNull();
    expect(userFromToken("a.W10.c")).toBeNull();
  });

  it("renvoie null quand l’identifiant de l’utilisateur manque", () => {
    const payload = btoa(JSON.stringify({ preferred_username: "x" }));

    expect(userFromToken(`a.${payload}.c`)).toBeNull();
  });
});
