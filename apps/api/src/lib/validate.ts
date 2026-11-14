import type { z } from "zod";

// Parses untrusted input. Fastify turns the thrown error into a 400 reply.
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Object.assign(new Error("Invalid request"), { statusCode: 400 });
  }
  return result.data;
}
