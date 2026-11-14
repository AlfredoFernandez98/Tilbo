import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { and, count, eq, gt } from "drizzle-orm";
import {
  acceptInviteBodySchema,
  GROUP_LIMITS,
  groupIdParamsSchema,
  type GroupResponse,
  type InviteResponse,
} from "@tilbo/shared";
import { groupMembers, groups, invites } from "../../db/schema.ts";
import { HttpError } from "../../lib/http-error.ts";
import { parse } from "../../lib/validate.ts";
import { assertUserCanJoin, getRole } from "../groups/membership.ts";

const INVITE_DAYS = 7;
const sha256 = (token: string) => createHash("sha256").update(token).digest("hex");

export async function invitesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // Only admins can invite. Non-members get 404, so they cannot tell whether the group exists.
  app.post("/api/groups/:groupId/invites", async (req, reply) => {
    const { groupId } = parse(groupIdParamsSchema, req.params);
    const role = await getRole(app.db, groupId, req.user.sub);
    if (!role) throw new HttpError(404, "group_not_found");
    if (role !== "admin") throw new HttpError(403, "admin_only");

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    await app.db.insert(invites).values({ groupId, tokenHash: sha256(token), createdBy: req.user.sub, expiresAt });

    const res: InviteResponse = { token, expiresAt: expiresAt.toISOString() };
    return reply.code(201).send(res);
  });

  // A shared link: anyone logged in with the token can join until it expires or the group is full.
  // The token is in the body, not the URL, so it never ends up in request logs (security.md).
  app.post("/api/invites/accept", async (req): Promise<GroupResponse> => {
    const { token } = parse(acceptInviteBodySchema, req.body);
    const userId = req.user.sub;

    return app.db.transaction(async (tx) => {
      const [group] = await tx
        .select({ id: groups.id, name: groups.name, postalCode: groups.postalCode })
        .from(invites)
        .innerJoin(groups, eq(groups.id, invites.groupId))
        .where(and(eq(invites.tokenHash, sha256(token)), gt(invites.expiresAt, new Date())));
      // Unknown and expired links look the same.
      if (!group) throw new HttpError(404, "invite_not_found");

      if (await getRole(tx, group.id, userId)) throw new HttpError(409, "already_member");

      // Locks the user row first, then the group row: always this order, so no deadlocks.
      await assertUserCanJoin(tx, userId, group.name);
      const [locked] = await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, group.id)).for("update");
      // The group may have been deleted (last member left) between the read and the lock.
      if (!locked) throw new HttpError(404, "invite_not_found");

      const [{ value: members } = { value: 0 }] = await tx
        .select({ value: count() })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, group.id));
      if (members >= GROUP_LIMITS.maxMembers) throw new HttpError(409, "group_full");

      await tx.insert(groupMembers).values({ groupId: group.id, userId, role: "member" });
      return { id: group.id, name: group.name, postalCode: group.postalCode, role: "member", memberCount: members + 1 };
    });
  });
}
