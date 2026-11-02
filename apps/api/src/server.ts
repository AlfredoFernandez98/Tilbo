import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const app = buildApp({ logger: config.NODE_ENV !== "test" });

await app.listen({ host: config.HOST, port: config.PORT });
