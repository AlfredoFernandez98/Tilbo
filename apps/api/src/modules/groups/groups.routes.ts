import type { FastifyInstance } from "fastify";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { createGroupBodySchema, groupIdParamsSchema, updateGroupBodySchema, type GroupResponse } from "@tilbo/shared";
import { groupMembers, groups, shoppingLists, users } from "../../db/schema.ts";
import { HttpError } from "../../lib/http-error.ts";
import { parse } from "../../lib/validate.ts";
import { assertUserCanJoin, getRole } from "./membership.ts";

export async function groupsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post("/api/groups", async (req, reply) => {
    const body = parse(createGroupBodySchema, req.body);
    const userId = req.user.sub;
    const group = await app.db.transaction(async (tx) => {
      await assertUserCanJoin(tx, userId, body.name);
      const [created] = await tx
        .insert(groups)
        .values({ name: body.name, postalCode: body.postalCode, createdBy: userId })
        .returning();
      await tx.insert(groupMembers).values({ groupId: created!.id, userId, role: "admin" });
      await tx.insert(shoppingLists).values({ groupId: created!.id });
      return created!;
    });
    const res: GroupResponse = {
      id: group.id,
      name: group.name,
      postalCode: group.postalCode,
      role: "admin",
      memberCount: 1,
    };
    return reply.code(201).send(res);
  });

  // Only the caller's own groups, so groups stay closed to non-members.
  app.get("/api/groups", async (req): Promise<GroupResponse[]> => {
    const mine = app.db
      .select({ groupId: groupMembers.groupId, role: groupMembers.role })
      .from(groupMembers)
      .where(eq(groupMembers.userId, req.user.sub))
      .as("mine");
    return app.db
      .select({
        id: groups.id,
        name: groups.name,
        postalCode: groups.postalCode,
        role: mine.role,
        memberCount: sql<number>`(select count(*)::int from ${groupMembers} where ${groupMembers.groupId} = ${groups.id})`,
      })
      .from(groups)
      .innerJoin(mine, eq(mine.groupId, groups.id))
      // Case-insensitive, so "anna" and "Zoo" sort as people expect.
      .orderBy(sql`lower(${groups.name})`);
  });

  // Admin only. A new name must not clash with another group any member is in (the rule is per user).
  app.patch("/api/groups/:groupId", async (req): Promise<GroupResponse> => {
    const { groupId } = parse(groupIdParamsSchema, req.params);
    const body = parse(updateGroupBodySchema, req.body);

    return app.db.transaction(async (tx) => {
      // Lock order user before group, as in assertUserCanJoin, so a member cannot join a same-named group meanwhile.
      // Accept re-checks the name after its group lock, so someone joining this group during the rename is covered too.
      // Sorted by id: two renames sharing members lock them in the same order. "no key update" still blocks
      // assertUserCanJoin, but not the foreign-key checks of inserts (invites, items) that point at these users.
      const memberIds = tx.select({ id: groupMembers.userId }).from(groupMembers).where(eq(groupMembers.groupId, groupId));
      await tx
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, memberIds))
        .orderBy(users.id)
        .for("no key update");
      const [locked] = await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).for("update");
      const role = locked && (await getRole(tx, groupId, req.user.sub));
      if (!role) throw new HttpError(404, "group_not_found");
      if (role !== "admin") throw new HttpError(403, "admin_only");

      if (body.name !== undefined) {
        const [clash] = await tx
          .select({ id: groups.id })
          .from(groups)
          .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
          .where(
            and(
              inArray(groupMembers.userId, memberIds),
              ne(groups.id, groupId),
              sql`lower(${groups.name}) = lower(${body.name})`,
            ),
          )
          .limit(1);
        if (clash) throw new HttpError(409, "group_name_taken");
      }

      const [updated] = await tx.update(groups).set(body).where(eq(groups.id, groupId)).returning();
      const memberCount = await tx.$count(groupMembers, eq(groupMembers.groupId, groupId));
      return { id: updated!.id, name: updated!.name, postalCode: updated!.postalCode, role, memberCount };
    });
  });

  // Hole 7: if the last admin leaves, the longest-standing member becomes admin.
  // If the last member leaves, the group and its invites are deleted.
  app.delete("/api/groups/:groupId/members/me", async (req, reply) => {
    const { groupId } = parse(groupIdParamsSchema, req.params);
    const userId = req.user.sub;

    await app.db.transaction(async (tx) => {
      // Lock the group so two members leaving at once cannot both skip the admin hand-over.
      await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).for("update");
      if (!(await getRole(tx, groupId, userId))) throw new HttpError(404, "group_not_found");

      await tx.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

      const rest = await tx
        .select({ userId: groupMembers.userId, role: groupMembers.role })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId))
        .orderBy(asc(groupMembers.joinedAt), asc(groupMembers.userId));
      if (rest.length === 0) {
        await tx.delete(groups).where(eq(groups.id, groupId));
      } else if (!rest.some((m) => m.role === "admin")) {
        await tx
          .update(groupMembers)
          .set({ role: "admin" })
          .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, rest[0]!.userId)));
      }
    });
    return reply.code(204).send();
  });
}
