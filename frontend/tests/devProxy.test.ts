import { describe, expect, it } from "vitest";
import config from "../vite.config";

type ResolvedConfig = {
  server: { port: number; strictPort: boolean; proxy: Record<string, { target: string }> };
};

const resolved = config({ command: "serve", mode: "test" }) as ResolvedConfig;
const proxy = resolved.server.proxy;

describe("port du serveur de développement", () => {
  it("reste le 5173, le seul que Keycloak autorise, sans en changer en silence", () => {
    expect(resolved.server.port).toBe(5173);
    expect(resolved.server.strictPort).toBe(true);
  });
});

describe("proxy du serveur de développement", () => {
  it("ne redirige plus la connexion : elle passe par Keycloak", () => {
    expect(proxy["/api/auth"]).toBeUndefined();
  });

  it.each([
    "/api/collectibles",
    "/api/categories",
    "/api/admin",
  ])(
    "envoie %s au collection-service",
    (route) => {
      expect(proxy[route].target).toBe("http://127.0.0.1:8081");
    },
  );

  it("ne redirige que les routes de l’API", () => {
    expect(Object.keys(proxy).every((route) => route.startsWith("/api/"))).toBe(
      true,
    );
  });
});
