import { z } from "zod";

// The app does not start if an env variable is missing or invalid.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(3000),
  // PGlite data folder. "memory://" keeps everything in memory (tests).
  PGLITE_DIR: z.string().default(".pglite"),
  // Signs the login cookie. Generate with: openssl rand -base64 48
  JWT_SECRET: z.string().min(32),
  // The web app's origin. Write requests from any other origin are rejected (ADR 0001).
  APP_ORIGIN: z.url().default("http://localhost:5173"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return envSchema.parse(env);
}
