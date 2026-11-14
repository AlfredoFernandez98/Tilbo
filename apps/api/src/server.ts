import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createDb, migrateDb } from "./db/client.ts";

const config = loadConfig();
const db = createDb(config.PGLITE_DIR);
await migrateDb(db);
const app = buildApp(db, { logger: config.NODE_ENV !== "test" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void app.close());
}

await app.listen({ host: config.HOST, port: config.PORT });
