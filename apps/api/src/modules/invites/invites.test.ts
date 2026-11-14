import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { GROUP_LIMITS, groupResponseSchema, inviteResponseSchema } from "@tilbo/shared";
import { invites } from "../../db/schema.ts";
import { createTestApp, signupAs } from "../../test-utils.ts";

type Cookies = Record<string, string>;
let app: FastifyInstance;
let anna: Cookies;
let groupId: string;

beforeEach(async () => {
  app = await createTestApp();
  anna = await signupAs(app, "anna@example.com");
  groupId = (await createGroup(anna, "Home")).json().id;
});
afterEach(async () => {
  await app.close();
});

function createGroup(cookies: Cookies, name: string) {
  return app.inject({ method: "POST", url: "/api/groups", cookies, payload: { name, postalCode: "2100" } });
}
const invite = (cookies: Cookies, id = groupId) =>
  app.inject({ method: "POST", url: `/api/groups/${id}/invites`, cookies });
const accept = (cookies: Cookies, token: string) =>
  app.inject({ method: "POST", url: `/api/invites/${token}/accept`, cookies });
const newToken = async () => inviteResponseSchema.parse((await invite(anna)).json()).token;

describe("invites", () => {
  it("lets an admin create a 7-day link and stores only its hash", async () => {
    const res = await invite(anna);
    expect(res.statusCode).toBe(201);
    const { token, expiresAt } = inviteResponseSchema.parse(res.json());

    const days = (Date.parse(expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);
    const [row] = await app.db.select().from(invites);
    expect(row?.tokenHash).not.toBe(token);
    expect(row?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hides the group from non-members (404), refuses non-admins (403) and bad ids (400)", async () => {
    const ben = await signupAs(app, "ben@example.com");
    expect((await invite(ben)).statusCode).toBe(404);

    await accept(ben, await newToken());
    expect((await invite(ben)).statusCode).toBe(403);
    expect((await invite(anna, "not-a-uuid")).statusCode).toBe(400);
  });

  it("joins as member through a shared link that several people can use", async () => {
    const token = await newToken();
    const ben = await signupAs(app, "ben@example.com");
    const cleo = await signupAs(app, "cleo@example.com");

    const res = await accept(ben, token);
    expect(res.statusCode).toBe(200);
    expect(groupResponseSchema.parse(res.json())).toMatchObject({ id: groupId, role: "member", memberCount: 2 });
    expect((await accept(cleo, token)).json().memberCount).toBe(3);

    const list = await app.inject({ method: "GET", url: "/api/groups", cookies: anna });
    expect(list.json()[0]).toMatchObject({ role: "admin", memberCount: 3 });
  });

  it("rejects unknown and expired links the same way", async () => {
    const ben = await signupAs(app, "ben@example.com");
    const token = await newToken();
    await app.db.update(invites).set({ expiresAt: new Date(Date.now() - 1000) });

    const expired = await accept(ben, token);
    const unknown = await accept(ben, "no-such-token");
    expect(expired.statusCode).toBe(404);
    expect(expired.json()).toEqual(unknown.json());
  });

  it("rejects a user who is already a member", async () => {
    const res = await accept(anna, await newToken());
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "already_member" });
  });

  it("rejects joining when the user already has a group with the same name", async () => {
    const ben = await signupAs(app, "ben@example.com");
    await createGroup(ben, "HOME");
    const res = await accept(ben, await newToken());
    expect(res.json()).toEqual({ error: "group_name_taken" });
  });

  it(`stops at ${GROUP_LIMITS.maxMembers} members`, async () => {
    const token = await newToken();
    for (let i = 2; i <= GROUP_LIMITS.maxMembers; i++) {
      expect((await accept(await signupAs(app, `user${i}@example.com`), token)).statusCode).toBe(200);
    }
    const res = await accept(await signupAs(app, "late@example.com"), token);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "group_full" });
  });

  it("requires login", async () => {
    expect((await accept({}, await newToken())).statusCode).toBe(401);
    expect((await invite({})).statusCode).toBe(401);
  });
});
