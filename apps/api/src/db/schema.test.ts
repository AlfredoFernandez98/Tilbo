import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "./client.ts";
import { groupMembers, groups, users } from "./schema.ts";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});
afterEach(async () => {
  await db.$client.close();
});

const newUser = (email: string) => ({ name: "Test User", email, passwordHash: "x" });
// Postgres error code for a unique violation, so other errors (e.g. NOT NULL) do not pass the test.
const uniqueViolation = { cause: { code: "23505" } };

describe("schema", () => {
  it("rejects two users with the same email, ignoring case", async () => {
    await db.insert(users).values(newUser("a@example.com"));
    await expect(db.insert(users).values(newUser("A@Example.com"))).rejects.toMatchObject(uniqueViolation);
  });

  it("adds a member with role member by default and removes it with the group", async () => {
    const [user] = await db.insert(users).values(newUser("a@example.com")).returning();
    const [group] = await db
      .insert(groups)
      .values({ name: "Home", postalCode: "2100", createdBy: user!.id })
      .returning();
    await db.insert(groupMembers).values({ groupId: group!.id, userId: user!.id });

    const [member] = await db.select().from(groupMembers);
    expect(member?.role).toBe("member");

    await db.delete(groups).where(eq(groups.id, group!.id));
    expect(await db.select().from(groupMembers)).toEqual([]);
  });

  it("rejects the same user twice in one group", async () => {
    const [user] = await db.insert(users).values(newUser("a@example.com")).returning();
    const [group] = await db.insert(groups).values({ name: "Home", postalCode: "2100" }).returning();
    const member = { groupId: group!.id, userId: user!.id };
    await db.insert(groupMembers).values(member);
    await expect(db.insert(groupMembers).values(member)).rejects.toMatchObject(uniqueViolation);
  });
});
