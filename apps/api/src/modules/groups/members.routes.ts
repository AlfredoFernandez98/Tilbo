import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { groupIdParamsSchema, memberParamsSchema, type MemberResponse } from "@tilbo/shared";
import { groupMembers, groups, users } from "../../db/schema.ts";
import { HttpError } from "../../lib/http-error.ts";
import { parse } from "../../lib/validate.ts";
import { getRole } from "./membership.ts";

export async function membersRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // Non-members get 404, so they cannot tell whether the group exists.
  app.get("/api/groups/:groupId/members", async (req): Promise<MemberResponse[]> => {
    const { groupId } = parse(groupIdParamsSchema, req.params);
    if (!(await getRole(app.db, groupId, req.user.sub))) throw new HttpError(404, "group_not_found");

    const rows = await app.db
      .select({ userId: groupMembers.userId, name: users.name, role: groupMembers.role, joinedAt: groupMembers.joinedAt })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(asc(groupMembers.joinedAt), asc(groupMembers.userId));
    return rows.map((r) => ({ ...r, joinedAt: r.joinedAt.toISOString() }));
  });

  // An admin removes another member. Leaving yourself is DELETE .../members/me (admin hand-over lives there).
  app.delete("/api/groups/:groupId/members/:userId", async (req, reply) => {
    const { groupId, userId } = parse(memberParamsSchema, req.params);
    if (userId === req.user.sub) throw new HttpError(400, "use_leave");

    await app.db.transaction(async (tx) => {
      // Same group lock as leave and invite, so membership cannot change between check and delete.
      const [locked] = await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).for("update");
      const role = locked && (await getRole(tx, groupId, req.user.sub));
      if (!role) throw new HttpError(404, "group_not_found");
      if (role !== "admin") throw new HttpError(403, "admin_only");

      const removed = await tx
        .delete(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
        .returning({ userId: groupMembers.userId });
      if (removed.length === 0) throw new HttpError(404, "member_not_found");
    });
    return reply.code(204).send();
  });
}
