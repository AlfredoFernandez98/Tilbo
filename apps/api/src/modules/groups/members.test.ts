import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, signupAs } from "../../test-utils.ts";

type Cookies = Record<string, string>;
let app: FastifyInstance;
let anna: Cookies;
let groupId: string;

beforeEach(async () => {
  app = await createTestApp();
  anna = await signupAs(app, "anna@example.com", "Anna");
  const res = await app.inject({
    method: "POST",
    url: "/api/groups",
    cookies: anna,
    payload: { name: "Home", postalCode: "2100" },
  });
  groupId = res.json().id;
});
afterEach(async () => {
  await app.close();
});

async function join(email: string, name: string) {
  const cookies = await signupAs(app, email, name);
  const { token } = (await app.inject({ method: "POST", url: `/api/groups/${groupId}/invites`, cookies: anna })).json();
  const res = await app.inject({ method: "POST", url: "/api/invites/accept", cookies, payload: { token } });
  expect(res.statusCode).toBe(200);
  return cookies;
}
const members = (cookies: Cookies, id = groupId) =>
  app.inject({ method: "GET", url: `/api/groups/${id}/members`, cookies });
const remove = (cookies: Cookies, userId: string) =>
  app.inject({ method: "DELETE", url: `/api/groups/${groupId}/members/${userId}`, cookies });
const userIdOf = async (cookies: Cookies) =>
  (await app.inject({ method: "GET", url: "/api/auth/me", cookies })).json().id as string;

describe("list members", () => {
  it("lists members in join order with name and role, without emails", async () => {
    const ben = await join("ben@example.com", "Ben");
    const res = await members(ben);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject([
      { name: "Anna", role: "admin" },
      { name: "Ben", role: "member" },
    ]);
    expect(res.body).not.toContain("@example.com");
  });

  it("returns 404 to non-members", async () => {
    const eve = await signupAs(app, "eve@example.com");
    const res = await members(eve);

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "group_not_found" });
  });

  it("requires login", async () => {
    const res = await app.inject({ method: "GET", url: `/api/groups/${groupId}/members` });
    expect(res.statusCode).toBe(401);
  });
});

describe("remove member", () => {
  it("lets the admin remove a member", async () => {
    const ben = await join("ben@example.com", "Ben");
    expect((await remove(anna, await userIdOf(ben))).statusCode).toBe(204);

    expect((await members(anna)).json()).toMatchObject([{ name: "Anna" }]);
    expect((await members(ben)).statusCode).toBe(404);
  });

  it("forbids members from removing others", async () => {
    const ben = await join("ben@example.com", "Ben");
    const res = await remove(ben, await userIdOf(anna));

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "admin_only" });
  });

  it("returns 404 to non-members, so they cannot probe the group", async () => {
    const eve = await signupAs(app, "eve@example.com");
    const res = await remove(eve, await userIdOf(anna));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "group_not_found" });
  });

  it("returns 404 when the user is not in the group", async () => {
    const eve = await signupAs(app, "eve@example.com");
    const res = await remove(anna, await userIdOf(eve));

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "member_not_found" });
  });

  it("points admins removing themselves to leave", async () => {
    const res = await remove(anna, await userIdOf(anna));

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "use_leave" });
  });
});
