import { and, count, eq, sql } from "drizzle-orm";
import { GROUP_LIMITS } from "@tilbo/shared";
import type { Db } from "../../db/client.ts";
import { groupMembers, groups, users } from "../../db/schema.ts";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class GroupRuleError extends Error {
  readonly code: "group_limit" | "group_name_taken";
  constructor(code: "group_limit" | "group_name_taken") {
    super(code);
    this.code = code;
  }
}

// Call inside a transaction before the user joins or creates a group.
// Locking the user's row serialises that user's concurrent joins, so the limits cannot be raced (hole 8).
export async function assertUserCanJoin(tx: Tx, userId: string, groupName: string) {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");

  const [{ value: groupCount } = { value: 0 }] = await tx
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  if (groupCount >= GROUP_LIMITS.maxGroupsPerUser) throw new GroupRuleError("group_limit");

  const [sameName] = await tx
    .select({ id: groups.id })
    .from(groups)
    .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groupMembers.userId, userId), sql`lower(${groups.name}) = lower(${groupName})`));
  if (sameName) throw new GroupRuleError("group_name_taken");
}
