import { defineConfig } from "drizzle-kit";

// Only used to generate SQL migrations: pnpm --filter @tilbo/api db:generate
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
