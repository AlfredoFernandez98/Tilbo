import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { groups, invites } from "../../db/schema.ts";
import { createTestApp, signupAs } from "../../test-utils.ts";

type Cookies = Record<string, string>;
let app: FastifyInstance;
let anna: Cookies;
let groupId: string;

beforeEach(async () => {
  app = await createTestApp();
  anna = await signupAs(app, "anna@example.com");
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

async function join(email: string) {
  const cookies = await signupAs(app, email);
  const { token } = (await app.inject({ method: "POST", url: `/api/groups/${groupId}/invites`, cookies: anna })).json();
  await app.inject({ method: "POST", url: `/api/invites/${token}/accept`, cookies });
  return cookies;
}
const leave = (cookies: Cookies, id = groupId) =>
  app.inject({ method: "DELETE", url: `/api/groups/${id}/members/me`, cookies });
const myGroups = async (cookies: Cookies) =>
  (await app.inject({ method: "GET", url: "/api/groups", cookies })).json() as { role: string; memberCount: number }[];

describe("leave group", () => {
  it("removes a member and keeps the admin", async () => {
    const ben = await join("ben@example.com");
    expect((await leave(ben)).statusCode).toBe(204);

    expect(await myGroups(ben)).toEqual([]);
    expect(await myGroups(anna)).toMatchObject([{ role: "admin", memberCount: 1 }]);
  });

  it("makes the longest-standing member admin when the last admin leaves", async () => {
    const ben = await join("ben@example.com");
    const cleo = await join("cleo@example.com");
    await leave(anna);

    expect(await myGroups(ben)).toMatchObject([{ role: "admin", memberCount: 2 }]);
    expect(await myGroups(cleo)).toMatchObject([{ role: "member" }]);
  });

  it("deletes the group and its invites when the last member leaves", async () => {
    await app.inject({ method: "POST", url: `/api/groups/${groupId}/invites`, cookies: anna });
    expect((await leave(anna)).statusCode).toBe(204);

    expect(await app.db.select().from(groups)).toEqual([]);
    expect(await app.db.select().from(invites)).toEqual([]);
  });

  it("answers 404 for a group the user is not in, and 401 without login", async () => {
    const ben = await signupAs(app, "ben@example.com");
    expect((await leave(ben)).statusCode).toBe(404);
    expect((await leave(anna, "00000000-0000-0000-0000-000000000000")).statusCode).toBe(404);
    expect((await leave({})).statusCode).toBe(401);
  });
});
