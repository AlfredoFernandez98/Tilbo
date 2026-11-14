import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In development /api is proxied to Fastify, so web and api share an origin, like behind Caddy in production.
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
});
