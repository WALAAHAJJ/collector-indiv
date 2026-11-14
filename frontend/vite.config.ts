import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      // Keycloak ne renvoie vers le site que depuis http://localhost:5173 : pas de changement de port silencieux.
      port: 5173,
      strictPort: true,
      proxy: {
        "/api/collectibles": {
          target: env.VITE_COLLECTION_SERVICE_URL || "http://127.0.0.1:8081",
          changeOrigin: true,
        },
        "/api/categories": {
          target: env.VITE_COLLECTION_SERVICE_URL || "http://127.0.0.1:8081",
          changeOrigin: true,
        },
        "/api/admin": {
          target: env.VITE_COLLECTION_SERVICE_URL || "http://127.0.0.1:8081",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      css: false,
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/main.tsx"],
      },
    },
  };
});
