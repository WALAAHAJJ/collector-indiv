import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api/auth": {
          target: env.VITE_USER_SERVICE_URL || "http://127.0.0.1:8082",
          changeOrigin: true,
        },
        "/api/collectibles": {
          target: env.VITE_COLLECTION_SERVICE_URL || "http://127.0.0.1:8081",
          changeOrigin: true,
        },
      },
    },
  };
});
