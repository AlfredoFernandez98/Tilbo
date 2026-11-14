import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

// shortcut: PGlite (Postgres in WebAssembly, one connection) until Docker is set up. Switch to node-postgres before deploy (phase 2).
export function createDb(dataDir: string) {
  return drizzle(new PGlite(dataDir));
}

export type Db = ReturnType<typeof createDb>;
