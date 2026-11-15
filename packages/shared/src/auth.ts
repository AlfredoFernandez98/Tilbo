import { z } from "zod";

// Lowercased here so the API and the web app agree on one form.
const email = z.email().max(254).transform((e) => e.toLowerCase());

export const signupBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password: z.string().min(8).max(200),
});

export const loginBodySchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const userResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;

// Only the name for now. Changing email or password needs email verification (gap 6).
export const updateProfileBodySchema = signupBodySchema.pick({ name: true });

export type UpdateProfileBody = z.input<typeof updateProfileBodySchema>;
