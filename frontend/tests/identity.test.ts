import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken, getToken } from "../src/auth";

const keycloak = vi.hoisted(() => ({
  token: undefined as string | undefined,
  init: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateToken: vi.fn(),
}));

vi.mock("keycloak-js", () => ({
  default: vi.fn(function () {
    return keycloak;
  }),
}));

import { initIdentity, login, logout, register } from "../src/identity";

beforeEach(() => {
  vi.useFakeTimers();
  keycloak.token = undefined;
  keycloak.init.mockReset();
  keycloak.login.mockReset().mockResolvedValue(undefined);
  keycloak.register.mockReset().mockResolvedValue(undefined);
  keycloak.logout.mockReset().mockResolvedValue(undefined);
  keycloak.updateToken.mockReset();
});

afterEach(() => {
  clearToken();
  vi.useRealTimers();
});

describe("initIdentity", () => {
  it("garde le jeton d’une session déjà ouverte", async () => {
    keycloak.init.mockResolvedValue(true);
    keycloak.token = "jeton-keycloak";

    await initIdentity();

    expect(getToken()).toBe("jeton-keycloak");
  });

  it("vérifie la session en silence, avec PKCE, sans quitter la page", async () => {
    keycloak.init.mockResolvedValue(false);

    await initIdentity();

    expect(keycloak.init).toHaveBeenCalledWith(
      expect.objectContaining({
        onLoad: "check-sso",
        pkceMethod: "S256",
        silentCheckSsoFallback: false,
      }),
    );
  });

  it("reste visiteur quand personne n’est connecté", async () => {
    keycloak.init.mockResolvedValue(false);

    await initIdentity();

    expect(getToken()).toBeNull();
  });

  it("reste utilisable quand Keycloak est injoignable", async () => {
    keycloak.init.mockRejectedValue(new Error("injoignable"));

    await initIdentity();

    expect(getToken()).toBeNull();
  });

  it("renouvelle le jeton avant son expiration", async () => {
    keycloak.init.mockResolvedValue(true);
    keycloak.token = "premier";
    keycloak.updateToken.mockImplementation(() => {
      keycloak.token = "renouvelé";
      return Promise.resolve(true);
    });

    await initIdentity();
    await vi.advanceTimersByTimeAsync(20_000);

    expect(keycloak.updateToken).toHaveBeenCalledWith(60);
    expect(getToken()).toBe("renouvelé");
  });

  it("repasse en visiteur quand la session Keycloak est terminée", async () => {
    keycloak.init.mockResolvedValue(true);
    keycloak.token = "premier";
    keycloak.updateToken.mockRejectedValue(new Error("session terminée"));

    await initIdentity();
    expect(getToken()).toBe("premier");
    await vi.advanceTimersByTimeAsync(20_000);

    expect(getToken()).toBeNull();
  });
});

describe("connexion, inscription, déconnexion", () => {
  it("redirige vers la page de connexion de Keycloak", async () => {
    await login();

    expect(keycloak.login).toHaveBeenCalledOnce();
  });

  it("redirige vers la page d’inscription de Keycloak", async () => {
    await register();

    expect(keycloak.register).toHaveBeenCalledOnce();
  });

  it("efface le jeton puis ferme la session Keycloak", async () => {
    keycloak.init.mockResolvedValue(true);
    keycloak.token = "jeton";
    await initIdentity();

    await logout();

    expect(getToken()).toBeNull();
    expect(keycloak.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    });
  });
});
