import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // I udvikling sendes /api videre til Fastify, så web og api deler origin ligesom bag Caddy i prod.
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
});
