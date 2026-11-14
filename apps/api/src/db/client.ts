import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

// shortcut: PGlite (Postgres i WebAssembly, én forbindelse) indtil Docker er sat op. Skift til node-postgres før deploy (fase 2).
export function createDb(dataDir: string) {
  return drizzle(new PGlite(dataDir));
}

export type Db = ReturnType<typeof createDb>;
