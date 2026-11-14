import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createDb } from "./db/client.ts";

const config = loadConfig();
const app = buildApp(createDb(config.PGLITE_DIR), { logger: config.NODE_ENV !== "test" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void app.close());
}

await app.listen({ host: config.HOST, port: config.PORT });
