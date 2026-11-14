import Fastify, { type FastifyServerOptions } from "fastify";
import type { Db } from "./db/client.ts";
import { healthRoutes } from "./modules/health/health.routes.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

export function buildApp(db: Db, opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);
  app.decorate("db", db);
  // Close the database on shutdown so the PGlite folder is not left half-written.
  app.addHook("onClose", () => db.$client.close());
  app.register(healthRoutes);
  return app;
}
