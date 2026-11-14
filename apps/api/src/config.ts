import { z } from "zod";

// Appen starter ikke, hvis en env-variabel mangler eller er forkert.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(3000),
  // PGlite data folder. "memory://" keeps everything in memory (tests).
  PGLITE_DIR: z.string().default(".pglite"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return envSchema.parse(env);
}
