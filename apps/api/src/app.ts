import Fastify, { type FastifyServerOptions } from "fastify";
import { healthRoutes } from "./modules/health/health.routes.ts";

export function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);
  app.register(healthRoutes);
  return app;
}
