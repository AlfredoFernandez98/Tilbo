import { z } from "zod";

export const itemParamsSchema = z.object({ groupId: z.uuid(), itemId: z.uuid() });

export const createItemBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  note: z.string().trim().max(200).optional(),
});

// Any subset; `checked: false` undoes a check by mistake (hole 10).
export const updateItemBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    note: z.string().trim().max(200).nullable(),
    checked: z.boolean(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0);

export const itemResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  note: z.string().nullable(),
  addedBy: z.string().nullable(), // the member's name; null if the user is gone
  addedAt: z.iso.datetime(),
  checkedAt: z.iso.datetime().nullable(),
});

export type CreateItemBody = z.infer<typeof createItemBodySchema>;
export type UpdateItemBody = z.infer<typeof updateItemBodySchema>;
export type ItemResponse = z.infer<typeof itemResponseSchema>;
