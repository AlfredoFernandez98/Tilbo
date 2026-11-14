import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createTestDb } from "./db/client.ts";

// Fake secret for tests only. Low entropy on purpose, so it is obviously not a real key.
export const testConfig = loadConfig({ NODE_ENV: "test", JWT_SECRET: "test".repeat(8) });

// A fresh app with its own migrated in-memory database. Call app.close() when done.
export async function createTestApp() {
  return buildApp(await createTestDb(), testConfig);
}
