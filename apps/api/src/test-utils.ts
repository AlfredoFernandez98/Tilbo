import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createTestDb } from "./db/client.ts";
import { AUTH_COOKIE } from "./modules/auth/auth.routes.ts";

// Fake secret for tests only. Low entropy on purpose, so it is obviously not a real key.
export const testConfig = loadConfig({ NODE_ENV: "test", JWT_SECRET: "test".repeat(8) });

// A fresh app with its own migrated in-memory database. Call app.close() when done.
export async function createTestApp() {
  const app = buildApp(await createTestDb(), testConfig);
  const inject = app.inject.bind(app);
  // The CSRF guard refuses writes without an Origin (ADR 0001), so tests send the app's own unless they set one.
  app.inject = ((opts: InjectOptions) =>
    inject({ ...opts, headers: { origin: testConfig.APP_ORIGIN, ...opts.headers } })) as typeof app.inject;
  return app;
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
