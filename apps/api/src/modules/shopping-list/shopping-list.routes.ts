import type { FastifyInstance } from "fastify";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  createItemBodySchema,
  groupIdParamsSchema,
  itemParamsSchema,
  updateItemBodySchema,
  type ItemResponse,
} from "@tilbo/shared";
import type { Db } from "../../db/client.ts";
import { listItems, shoppingLists, users } from "../../db/schema.ts";
import { HttpError } from "../../lib/http-error.ts";
import { parse } from "../../lib/validate.ts";
import { getRole } from "../groups/membership.ts";

// Groups are closed: every route checks membership first. Non-members get 404.
async function listIdFor(db: Db, groupId: string, userId: string) {
  if (!(await getRole(db, groupId, userId))) throw new HttpError(404, "group_not_found");
  // The list is created on first use; on conflict another request created it first.
  await db.insert(shoppingLists).values({ groupId }).onConflictDoNothing();
  const [list] = await db.select({ id: shoppingLists.id }).from(shoppingLists).where(eq(shoppingLists.groupId, groupId));
  return list!.id;
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

    const check =
      body.checked === undefined ? {} : body.checked ? { checkedBy: userId, checkedAt: new Date() } : { checkedBy: null, checkedAt: null };
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
