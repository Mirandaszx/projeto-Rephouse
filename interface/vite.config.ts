import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  publicDir: "publico",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target:
          loadEnv(mode, process.cwd(), "").API_PROXY_TARGET ||
          "http://127.0.0.1:3000",
        changeOrigin: true,
        // O design do PR #2 usa arrays; a API principal permanece paginada.
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, "/api/front/v1"),
      },
    },
  },
}));
