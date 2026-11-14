import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { itemResponseSchema } from "@tilbo/shared";
import { eq } from "drizzle-orm";
import { listItems, users } from "../../db/schema.ts";
import { createTestApp, signupAs } from "../../test-utils.ts";

type Cookies = Record<string, string>;
let app: FastifyInstance;
let anna: Cookies;
let groupId: string;

beforeEach(async () => {
  app = await createTestApp();
  anna = await signupAs(app, "anna@example.com", "Anna");
  groupId = (await createGroup(anna, "Home")).json().id;
});
afterEach(async () => {
  await app.close();
});

function createGroup(cookies: Cookies, name: string) {
  return app.inject({ method: "POST", url: "/api/groups", cookies, payload: { name, postalCode: "2100" } });
}
const items = (cookies: Cookies, id = groupId) => app.inject({ method: "GET", url: `/api/groups/${id}/items`, cookies });
const add = (cookies: Cookies, payload: object, id = groupId) =>
  app.inject({ method: "POST", url: `/api/groups/${id}/items`, cookies, payload });
const update = (cookies: Cookies, itemId: string, payload: object, id = groupId) =>
  app.inject({ method: "PATCH", url: `/api/groups/${id}/items/${itemId}`, cookies, payload });

async function joinAs(email: string, name: string) {
  const cookies = await signupAs(app, email, name);
  const { token } = (await app.inject({ method: "POST", url: `/api/groups/${groupId}/invites`, cookies: anna })).json();
  const res = await app.inject({ method: "POST", url: "/api/invites/accept", cookies, payload: { token } });
  expect(res.statusCode).toBe(200);
  return cookies;
}

describe("shopping list", () => {
  it("adds an item with a note and shows who added it to every member", async () => {
    const ben = await joinAs("ben@example.com", "Ben");
    const res = await add(anna, { name: "Skyr", note: "den laktosefri" });
    expect(res.statusCode).toBe(201);
    expect(itemResponseSchema.parse(res.json())).toMatchObject({ name: "Skyr", note: "den laktosefri", addedBy: "Anna" });

    const list = await items(ben);
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject([{ name: "Skyr", addedBy: "Anna", checkedAt: null }]);
  });

  it("keeps who bought it when a second member checks a stale list, and clears it on undo", async () => {
    const ben = await joinAs("ben@example.com", "Ben");
    const { id } = (await add(anna, { name: "Milk" })).json();
    const [annaUser] = await app.db.select().from(users).where(eq(users.email, "anna@example.com"));
    const row = async () => (await app.db.select().from(listItems).where(eq(listItems.id, id)))[0]!;

    await update(anna, id, { checked: true });
    const first = await row();
    expect(first.checkedBy).toBe(annaUser!.id);

    await update(ben, id, { checked: true });
    const second = await row();
    expect(second.checkedBy).toBe(annaUser!.id);
    expect(second.checkedAt).toEqual(first.checkedAt);

    await update(ben, id, { checked: false });
    expect((await row()).checkedBy).toBeNull();
  });

  it("stores a blank note as no note", async () => {
    expect((await add(anna, { name: "Milk", note: "   " })).json().note).toBeNull();
  });

  it("hides checked items and brings them back on undo", async () => {
    const { id } = (await add(anna, { name: "Milk" })).json();

    const checked = await update(anna, id, { checked: true });
    expect(checked.json().checkedAt).not.toBeNull();
    expect((await items(anna)).json()).toEqual([]);

    await update(anna, id, { checked: false });
    expect((await items(anna)).json()).toMatchObject([{ name: "Milk", checkedAt: null }]);
  });

  it("edits name and clears the note", async () => {
    const { id } = (await add(anna, { name: "Milk", note: "2 stk" })).json();
    const res = await update(anna, id, { name: "Oat milk", note: null });
    expect(res.json()).toMatchObject({ name: "Oat milk", note: null });
  });

  it("keeps groups closed: non-members get 404, and items of another group cannot be changed", async () => {
    const ben = await signupAs(app, "ben@example.com", "Ben");
    expect((await items(ben)).statusCode).toBe(404);
    expect((await add(ben, { name: "Milk" })).statusCode).toBe(404);

    const bensGroup = (await createGroup(ben, "Other")).json().id;
    const { id } = (await add(anna, { name: "Milk" })).json();
    expect((await update(ben, id, { checked: true }, bensGroup)).statusCode).toBe(404);
  });

  it("rejects bad input with 400 and requires login", async () => {
    expect((await add(anna, { name: "" })).statusCode).toBe(400);
    const { id } = (await add(anna, { name: "Milk" })).json();
    expect((await update(anna, id, {})).statusCode).toBe(400);
    expect((await items({})).statusCode).toBe(401);
  });
});
