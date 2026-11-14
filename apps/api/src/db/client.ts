import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema.ts";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

// shortcut: PGlite (Postgres in WebAssembly, one connection) until Docker is set up. Switch to node-postgres before deploy (phase 2).
export function createDb(dataDir: string) {
  return drizzle(new PGlite(dataDir), { schema });
}

export type Db = ReturnType<typeof createDb>;

export async function migrateDb(db: Db) {
  await migrate(db, { migrationsFolder });
}

// For tests: a fresh in-memory database with all migrations applied.
export async function createTestDb() {
  const db = createDb("memory://");
  await migrateDb(db);
  return db;
}
