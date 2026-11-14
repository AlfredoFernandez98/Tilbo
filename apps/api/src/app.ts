import Fastify, { type FastifyReply, type FastifyRequest, type FastifyServerOptions } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { Config } from "./config.ts";
import type { Db } from "./db/client.ts";
import { AUTH_COOKIE, authRoutes } from "./modules/auth/auth.routes.ts";
import { groupsRoutes } from "./modules/groups/groups.routes.ts";
import { healthRoutes } from "./modules/health/health.routes.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
    config: Config;
    // Use as a route's onRequest hook: replies 401 unless the login cookie is valid.
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function buildApp(db: Db, config: Config, opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);
  app.decorate("db", db);
  app.decorate("config", config);
  // Close the database on shutdown so the PGlite folder is not left half-written.
  app.addHook("onClose", () => db.$client.close());

  app.register(cookie);
  app.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: AUTH_COOKIE, signed: false },
    sign: { expiresIn: "7d" },
  });

  // CSRF guard (ADR 0001): browsers always send Origin on cross-site writes, so a foreign Origin is refused.
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (!SAFE_METHODS.has(req.method) && origin !== undefined && origin !== config.APP_ORIGIN) {
      return reply.code(403).send({ error: "forbidden_origin" });
    }
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.register(healthRoutes);
  app.register(authRoutes);
  app.register(groupsRoutes);
  return app;
}
