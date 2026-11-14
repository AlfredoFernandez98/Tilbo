import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { GROUP_LIMITS, groupResponseSchema } from "@tilbo/shared";
import { users } from "../../db/schema.ts";
import { createTestApp, signupAs } from "../../test-utils.ts";

let app: FastifyInstance;
beforeEach(async () => {
  app = await createTestApp();
});
afterEach(async () => {
  await app.close();
});

const createGroup = (cookies: Record<string, string>, name: string, postalCode = "2100") =>
  app.inject({ method: "POST", url: "/api/groups", cookies, payload: { name, postalCode } });

const listGroups = (cookies: Record<string, string>) => app.inject({ method: "GET", url: "/api/groups", cookies });

describe("groups", () => {
  it("creates a group with the creator as admin", async () => {
    const anna = await signupAs(app, "anna@example.com");
    const res = await createGroup(anna, "Home");

    expect(res.statusCode).toBe(201);
    expect(groupResponseSchema.parse(res.json())).toMatchObject({ name: "Home", role: "admin", memberCount: 1 });
  });

  it("lists only the caller's own groups", async () => {
    const anna = await signupAs(app, "anna@example.com");
    const ben = await signupAs(app, "ben@example.com");
    await createGroup(anna, "Zoo");
    await createGroup(anna, "anna's");
    await createGroup(ben, "Work");

    const res = await listGroups(anna);
    expect(res.statusCode).toBe(200);
    expect(res.json().map((g: { name: string }) => g.name)).toEqual(["anna's", "Zoo"]);
  });

  it("treats a valid token for a deleted user as logged out", async () => {
    const anna = await signupAs(app, "anna@example.com");
    await app.db.delete(users);
    expect((await createGroup(anna, "Home")).statusCode).toBe(401);
  });

  it("requires login", async () => {
    expect((await listGroups({})).statusCode).toBe(401);
    expect((await createGroup({}, "Home")).statusCode).toBe(401);
  });

  it("rejects a bad postal code with 400", async () => {
    const anna = await signupAs(app, "anna@example.com");
    expect((await createGroup(anna, "Home", "21")).statusCode).toBe(400);
  });

  it(`stops at ${GROUP_LIMITS.maxGroupsPerUser} groups per user`, async () => {
    const anna = await signupAs(app, "anna@example.com");
    for (let i = 1; i <= GROUP_LIMITS.maxGroupsPerUser; i++) {
      expect((await createGroup(anna, `Group ${i}`)).statusCode).toBe(201);
    }
    const res = await createGroup(anna, "One too many");
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "group_limit" });
  });

  it("rejects a second group with the same name in other case, but other users may use it", async () => {
    const anna = await signupAs(app, "anna@example.com");
    const ben = await signupAs(app, "ben@example.com");
    await createGroup(anna, "Home");

    const again = await createGroup(anna, "HOME");
    expect(again.statusCode).toBe(409);
    expect(again.json()).toEqual({ error: "group_name_taken" });
    expect((await createGroup(ben, "Home")).statusCode).toBe(201);
  });
});
