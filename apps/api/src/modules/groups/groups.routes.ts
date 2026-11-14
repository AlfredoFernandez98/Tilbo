import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { createGroupBodySchema, type GroupResponse } from "@tilbo/shared";
import { groupMembers, groups } from "../../db/schema.ts";
import { parse } from "../../lib/validate.ts";
import { assertUserCanJoin } from "./membership.ts";

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
}
