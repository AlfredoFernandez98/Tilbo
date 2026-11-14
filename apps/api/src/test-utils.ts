import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createTestDb } from "./db/client.ts";
import { AUTH_COOKIE } from "./modules/auth/auth.routes.ts";

// Fake secret for tests only. Low entropy on purpose, so it is obviously not a real key.
export const testConfig = loadConfig({ NODE_ENV: "test", JWT_SECRET: "test".repeat(8) });

// A fresh app with its own migrated in-memory database. Call app.close() when done.
export async function createTestApp() {
  return buildApp(await createTestDb(), testConfig);
}

// Signs up a user and returns the cookies to send as that user.
export async function signupAs(app: FastifyInstance, email: string, name = "Test User") {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/signup",
    payload: { name, email, password: "correct horse" },
  });
  const session = res.cookies.find((c) => c.name === AUTH_COOKIE);
  if (!session) throw new Error(`signup failed: ${res.statusCode} ${res.body}`);
  return { [AUTH_COOKIE]: session.value };
}
