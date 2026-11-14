import type { FastifyInstance } from "fastify";
import { and, asc, eq, sql } from "drizzle-orm";
import { createGroupBodySchema, groupIdParamsSchema, type GroupResponse } from "@tilbo/shared";
import { groupMembers, groups } from "../../db/schema.ts";
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
