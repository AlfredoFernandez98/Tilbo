import type { FastifyInstance } from "fastify";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
  createItemBodySchema,
  groupIdParamsSchema,
  itemParamsSchema,
  updateItemBodySchema,
  type ItemResponse,
} from "@tilbo/shared";
import type { Db } from "../../db/client.ts";
import { groupMembers, listItems, shoppingLists, users } from "../../db/schema.ts";
import { HttpError } from "../../lib/http-error.ts";
import { parse } from "../../lib/validate.ts";

// Groups are closed: the list is only found through the caller's membership. Non-members get 404.
// The list is created together with the group (POST /api/groups).
async function listIdFor(db: Db, groupId: string, userId: string) {
  const [list] = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, shoppingLists.groupId), eq(groupMembers.userId, userId)))
    .where(eq(shoppingLists.groupId, groupId));
  if (!list) throw new HttpError(404, "group_not_found");
  return list.id;
}

const itemColumns = {
  id: listItems.id,
  name: listItems.name,
  note: listItems.note,
  addedBy: users.name,
  addedAt: listItems.addedAt,
  checkedAt: listItems.checkedAt,
};

const toItem = (row: { id: string; name: string; note: string | null; addedBy: string | null; addedAt: Date; checkedAt: Date | null }): ItemResponse => ({
  ...row,
  addedAt: row.addedAt.toISOString(),
  checkedAt: row.checkedAt?.toISOString() ?? null,
});

export async function shoppingListRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // Checked items are hidden from the list (plan section 1).
  app.get("/api/groups/:groupId/items", async (req): Promise<ItemResponse[]> => {
    const { groupId } = parse(groupIdParamsSchema, req.params);
    const listId = await listIdFor(app.db, groupId, req.user.sub);
    const rows = await app.db
      .select(itemColumns)
      .from(listItems)
      .leftJoin(users, eq(users.id, listItems.addedBy))
      .where(and(eq(listItems.listId, listId), isNull(listItems.checkedAt)))
      .orderBy(asc(listItems.addedAt));
    return rows.map(toItem);
  });

  app.post("/api/groups/:groupId/items", async (req, reply) => {
    const { groupId } = parse(groupIdParamsSchema, req.params);
    const body = parse(createItemBodySchema, req.body);
    const userId = req.user.sub;
    const listId = await listIdFor(app.db, groupId, userId);
    const [item] = await app.db
      .insert(listItems)
      .values({ listId, name: body.name, note: body.note ?? null, addedBy: userId })
      .returning();
    const [me] = await app.db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    return reply.code(201).send(toItem({ ...item!, addedBy: me?.name ?? null }));
  });

  app.patch("/api/groups/:groupId/items/:itemId", async (req): Promise<ItemResponse> => {
    const { groupId, itemId } = parse(itemParamsSchema, req.params);
    const body = parse(updateItemBodySchema, req.body);
    const userId = req.user.sub;
    const listId = await listIdFor(app.db, groupId, userId);

    // The first check wins: a second member checking a stale list does not overwrite who bought it.
    const check =
      body.checked === undefined
        ? {}
        : body.checked
          ? {
              checkedAt: sql`coalesce(${listItems.checkedAt}, now())`,
              checkedBy: sql`case when ${listItems.checkedAt} is null then ${userId}::uuid else ${listItems.checkedBy} end`,
            }
          : { checkedBy: null, checkedAt: null };
    // Filtering on listId too, so an item id from another group cannot be changed.
    const [updated] = await app.db
      .update(listItems)
      .set({ name: body.name, note: body.note, ...check })
      .where(and(eq(listItems.id, itemId), eq(listItems.listId, listId)))
      .returning({ id: listItems.id });
    if (!updated) throw new HttpError(404, "item_not_found");

    const [row] = await app.db
      .select(itemColumns)
      .from(listItems)
      .leftJoin(users, eq(users.id, listItems.addedBy))
      .where(eq(listItems.id, itemId));
    return toItem(row!);
  });
}
