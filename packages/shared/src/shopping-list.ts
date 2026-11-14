import { z } from "zod";

export const itemParamsSchema = z.object({ groupId: z.uuid(), itemId: z.uuid() });

// A blank note is stored as no note.
const optionalNote = z
  .string()
  .trim()
  .max(200)
  .transform((s) => s || null);

export const createItemBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  note: optionalNote.optional(),
});

// Any subset; `checked: false` undoes a check by mistake (hole 10).
export const updateItemBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    note: optionalNote.nullable(),
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

// Input types: what a client sends (before the blank-note transform).
export type CreateItemBody = z.input<typeof createItemBodySchema>;
export type UpdateItemBody = z.input<typeof updateItemBodySchema>;
export type ItemResponse = z.infer<typeof itemResponseSchema>;
