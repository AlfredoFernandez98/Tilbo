import Fastify, { type FastifyReply, type FastifyRequest, type FastifyServerOptions } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { Config } from "./config.ts";
import type { Db } from "./db/client.ts";
import { AUTH_COOKIE, authRoutes } from "./modules/auth/auth.routes.ts";
import { groupsRoutes } from "./modules/groups/groups.routes.ts";
import { healthRoutes } from "./modules/health/health.routes.ts";
import { membersRoutes } from "./modules/groups/members.routes.ts";
import { invitesRoutes } from "./modules/invites/invites.routes.ts";
import { shoppingListRoutes } from "./modules/shopping-list/shopping-list.routes.ts";

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
    // Only the cookie, not an Authorization header (ADR 0001).
    verify: { onlyCookie: true },
  });

  // Never send internal error text to clients: database errors contain the SQL and its params.
  app.setErrorHandler((err: { statusCode?: number; message: string }, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status >= 500) {
      req.log.error({ err }, "request failed");
      return reply.code(status).send({ error: "internal" });
    }
    return reply.code(status).send({ error: err.message });
  });

  // CSRF guard (ADR 0001): writes must carry the app's own Origin. Browsers always send it on non-GET requests,
  // so refusing a missing Origin only affects non-browser clients.
  app.addHook("onRequest", async (req, reply) => {
    if (!SAFE_METHODS.has(req.method) && req.headers.origin !== config.APP_ORIGIN) {
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
  app.register(membersRoutes);
  app.register(invitesRoutes);
  app.register(shoppingListRoutes);
  return app;
}
