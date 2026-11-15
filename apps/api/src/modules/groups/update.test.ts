import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { groupResponseSchema } from "@tilbo/shared";
import { createTestApp, signupAs } from "../../test-utils.ts";

type Cookies = Record<string, string>;
let app: FastifyInstance;
let anna: Cookies;
let groupId: string;

const createGroup = async (cookies: Cookies, name: string) =>
  (await app.inject({ method: "POST", url: "/api/groups", cookies, payload: { name, postalCode: "2100" } })).json()
    .id as string;

beforeEach(async () => {
  app = await createTestApp();
  anna = await signupAs(app, "anna@example.com");
  groupId = await createGroup(anna, "Home");
});
afterEach(async () => {
  await app.close();
});

async function join(email: string) {
  const cookies = await signupAs(app, email);
  const { token } = (await app.inject({ method: "POST", url: `/api/groups/${groupId}/invites`, cookies: anna })).json();
  await app.inject({ method: "POST", url: "/api/invites/accept", cookies, payload: { token } });
  return cookies;
}
const update = (cookies: Cookies, payload: object) =>
  app.inject({ method: "PATCH", url: `/api/groups/${groupId}`, cookies, payload });

describe("update group", () => {
  it("lets the admin rename the group and change the postal code", async () => {
    await join("ben@example.com");
    const res = await update(anna, { name: "Summer house", postalCode: "8000" });

    expect(res.statusCode).toBe(200);
    expect(groupResponseSchema.parse(res.json())).toEqual({
      id: groupId,
      name: "Summer house",
      postalCode: "8000",
      role: "admin",
      memberCount: 2,
    });
  });

  it("changes only the fields that are sent", async () => {
    const res = await update(anna, { postalCode: "8000" });

    expect(res.json()).toMatchObject({ name: "Home", postalCode: "8000" });
  });

  it("allows changing only the case of the current name", async () => {
    const res = await update(anna, { name: "HOME" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: "HOME" });
  });

  it("rejects a name another member already has for one of their groups", async () => {
    const ben = await join("ben@example.com");
    await createGroup(ben, "Work");
    const res = await update(anna, { name: "work" });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "group_name_taken" });
  });

  it("rejects an empty body and a bad postal code", async () => {
    expect((await update(anna, {})).statusCode).toBe(400);
    expect((await update(anna, { postalCode: "12" })).statusCode).toBe(400);
    expect((await update(anna, { name: " " })).statusCode).toBe(400);
  });

  it("forbids members who are not admin", async () => {
    const ben = await join("ben@example.com");
    const res = await update(ben, { name: "Mine" });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "admin_only" });
  });

  it("returns 404 to non-members", async () => {
    const eve = await signupAs(app, "eve@example.com");
    const res = await update(eve, { name: "Mine" });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "group_not_found" });
  });
});
