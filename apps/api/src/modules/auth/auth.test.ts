import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { userResponseSchema } from "@tilbo/shared";
import { buildApp } from "../../app.ts";
import { createTestDb } from "../../db/client.ts";
import { createTestApp, testConfig } from "../../test-utils.ts";
import { users } from "../../db/schema.ts";
import { AUTH_COOKIE } from "./auth.routes.ts";

let app: FastifyInstance;
beforeEach(async () => {
  app = await createTestApp();
});
afterEach(async () => {
  await app.close();
});

const signup = (email = "Anna@Example.com", password = "correct horse") =>
  app.inject({ method: "POST", url: "/api/auth/signup", payload: { name: "Anna", email, password } });

const login = (email: string, password: string) =>
  app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });

const sessionCookie = (res: Awaited<ReturnType<typeof signup>>) =>
  res.cookies.find((c) => c.name === AUTH_COOKIE);

describe("auth", () => {
  it("signs up, lowercases the email and sets a safe session cookie", async () => {
    const res = await signup();

    expect(res.statusCode).toBe(201);
    expect(userResponseSchema.parse(res.json()).email).toBe("anna@example.com");
    const cookie = sessionCookie(res);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/api", maxAge: 604800 });
    expect(res.body).not.toContain("password");
  });

  it("rejects a second signup with the same email in other case", async () => {
    await signup("anna@example.com");
    const res = await signup("ANNA@example.com");
    expect(res.statusCode).toBe(409);
  });

  it("rejects an invalid signup body with 400", async () => {
    const res = await signup("not-an-email", "short");
    expect(res.statusCode).toBe(400);
  });

  it("logs in with the right password, in any email case", async () => {
    await signup();
    const res = await login("ANNA@example.com", "correct horse");
    expect(res.statusCode).toBe(200);
    expect(sessionCookie(res)).toBeDefined();
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    await signup();
    const wrong = await login("anna@example.com", "wrong password");
    const unknown = await login("nobody@example.com", "correct horse");

    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
  });

  it("returns the current user from the cookie, and 401 without it", async () => {
    const token = sessionCookie(await signup())!.value;

    const me = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { [AUTH_COOKIE]: token } });
    expect(me.statusCode).toBe(200);
    expect(me.json().name).toBe("Anna");

    expect((await app.inject({ method: "GET", url: "/api/auth/me" })).statusCode).toBe(401);
    const forged = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { [AUTH_COOKIE]: "forged" } });
    expect(forged.statusCode).toBe(401);
  });

  it("updates the user's own name and trims it", async () => {
    const cookies = { [AUTH_COOKIE]: sessionCookie(await signup())!.value };
    const res = await app.inject({ method: "PATCH", url: "/api/auth/me", cookies, payload: { name: "  Anna B  " } });

    expect(res.statusCode).toBe(200);
    expect(userResponseSchema.parse(res.json())).toMatchObject({ name: "Anna B", email: "anna@example.com" });
    expect((await app.inject({ method: "GET", url: "/api/auth/me", cookies })).json().name).toBe("Anna B");
  });

  it("rejects an empty name and ignores other fields like email", async () => {
    const cookies = { [AUTH_COOKIE]: sessionCookie(await signup())!.value };
    const patch = (payload: object) => app.inject({ method: "PATCH", url: "/api/auth/me", cookies, payload });

    expect((await patch({ name: " " })).statusCode).toBe(400);
    expect((await patch({ email: "eve@example.com" })).statusCode).toBe(400);
    const res = await patch({ name: "Anna", email: "eve@example.com", password: "new password 123" });
    expect(res.json().email).toBe("anna@example.com");
    expect((await login("anna@example.com", "correct horse")).statusCode).toBe(200);
  });

  it("treats a valid token for a deleted user as logged out on update", async () => {
    const cookies = { [AUTH_COOKIE]: sessionCookie(await signup())!.value };
    await app.db.delete(users);
    const res = await app.inject({ method: "PATCH", url: "/api/auth/me", cookies, payload: { name: "Ghost" } });

    expect(res.statusCode).toBe(401);
  });

  it("requires login to update the profile", async () => {
    const res = await app.inject({ method: "PATCH", url: "/api/auth/me", payload: { name: "Eve" } });
    expect(res.statusCode).toBe(401);
  });

  it("clears the cookie on logout", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/logout" });
    expect(res.statusCode).toBe(204);
    expect(sessionCookie(res)?.value).toBe("");
  });

  it("refuses writes from a foreign origin but allows the app's own", async () => {
    const payload = { name: "Anna", email: "anna@example.com", password: "correct horse" };
    const foreign = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      headers: { origin: "https://evil.example.com" },
      payload,
    });
    expect(foreign.statusCode).toBe(403);

    const own = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      headers: { origin: testConfig.APP_ORIGIN },
      payload,
    });
    expect(own.statusCode).toBe(201);
  });

  it("refuses writes without an Origin header but allows reads", async () => {
    // Built directly: createTestApp() adds the app's own Origin to every request.
    const bare = buildApp(await createTestDb(), testConfig);
    const write = await bare.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { name: "Anna", email: "anna@example.com", password: "correct horse" },
    });
    expect(write.statusCode).toBe(403);
    expect(write.json()).toEqual({ error: "forbidden_origin" });

    const read = await bare.inject({ method: "GET", url: "/api/health" });
    expect(read.statusCode).toBe(200);
    await bare.close();
  });

  it("hides database errors: 500 with no SQL, email or hash in the reply", async () => {
    // A failed query carries the SQL and its params (email, password hash) in its message.
    await app.db.execute(sql`drop table users cascade`);
    const res = await signup();

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "internal" });
    expect(res.body).not.toMatch(/argon2|example\.com|insert/i);
  });

  it("ignores a token sent as a Bearer header instead of the cookie", async () => {
    const token = sessionCookie(await signup())!.value;
    const res = await app.inject({ method: "GET", url: "/api/auth/me", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);
  });

  it("marks the cookie Secure in production", async () => {
    const prod = buildApp(await createTestDb(), { ...testConfig, NODE_ENV: "production" });
    const res = await prod.inject({
      method: "POST",
      url: "/api/auth/signup",
      headers: { origin: testConfig.APP_ORIGIN },
      payload: { name: "Anna", email: "anna@example.com", password: "correct horse" },
    });
    expect(sessionCookie(res)?.secure).toBe(true);
    await prod.close();
  });
});
