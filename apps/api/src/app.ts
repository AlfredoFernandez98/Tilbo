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
  app.register(healthRoutes);
  return app;
}
