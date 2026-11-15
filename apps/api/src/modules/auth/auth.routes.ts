import type { FastifyInstance, FastifyReply } from "fastify";
import { eq, sql } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { loginBodySchema, signupBodySchema, updateProfileBodySchema, type UserResponse } from "@tilbo/shared";
import { users } from "../../db/schema.ts";
import { parse } from "../../lib/validate.ts";

export const AUTH_COOKIE = "tilbo_session";
const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

const toUser = (u: typeof users.$inferSelect): UserResponse => ({ id: u.id, name: u.name, email: u.email });

export async function authRoutes(app: FastifyInstance) {
  // Login checks a password even for unknown emails, so response time does not reveal which emails exist.
  const dummyHash = await hash("not-a-real-password");

  async function setSession(reply: FastifyReply, userId: string) {
    const token = await reply.jwtSign({ sub: userId });
    reply.setCookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: app.config.NODE_ENV === "production",
      path: "/api",
      maxAge: SEVEN_DAYS_S,
    });
  }

  app.post("/api/auth/signup", async (req, reply) => {
    const body = parse(signupBodySchema, req.body);
    const passwordHash = await hash(body.password);
    try {
      const [user] = await app.db
        .insert(users)
        .values({ name: body.name, email: body.email, passwordHash })
        .returning();
      await setSession(reply, user!.id);
      return reply.code(201).send(toUser(user!));
    } catch (err) {
      if ((err as { cause?: { code?: string } }).cause?.code === "23505") {
        return reply.code(409).send({ error: "email_taken" });
      }
      throw err;
    }
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = parse(loginBodySchema, req.body);
    const [user] = await app.db.select().from(users).where(sql`lower(${users.email}) = ${body.email}`);
    const ok = await verify(user?.passwordHash ?? dummyHash, body.password);
    if (!user || !ok) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    await setSession(reply, user.id);
    return toUser(user);
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(AUTH_COOKIE, { path: "/api" });
    return reply.code(204).send();
  });

  app.get("/api/auth/me", { onRequest: [app.authenticate] }, async (req, reply) => {
    const [user] = await app.db.select().from(users).where(eq(users.id, req.user.sub));
    // A valid token for a deleted user is treated as logged out.
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return toUser(user);
  });

  app.patch("/api/auth/me", { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = parse(updateProfileBodySchema, req.body);
    const [user] = await app.db.update(users).set(body).where(eq(users.id, req.user.sub)).returning();
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return toUser(user);
  });
}
