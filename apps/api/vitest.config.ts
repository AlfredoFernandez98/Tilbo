import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each test boots PGlite and hashes passwords with argon2, which is slow on shared CI runners.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
