import { z } from "zod";

// App rules from .claude/rules/api.md. The API enforces them; the web app may show them.
export const GROUP_LIMITS = { maxMembers: 10, maxGroupsPerUser: 5 } as const;

export const createGroupBodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  // Danish postal codes are four digits.
  postalCode: z.string().regex(/^\d{4}$/),
});

export const groupResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  postalCode: z.string(),
  role: z.enum(["admin", "member"]),
  memberCount: z.number().int().positive(),
});

export type CreateGroupBody = z.infer<typeof createGroupBodySchema>;
export type GroupResponse = z.infer<typeof groupResponseSchema>;

export const groupIdParamsSchema = z.object({ groupId: z.uuid() });

// The token is shown once, when the invite is created. The server only keeps its hash.
export const inviteResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
});

export type InviteResponse = z.infer<typeof inviteResponseSchema>;
