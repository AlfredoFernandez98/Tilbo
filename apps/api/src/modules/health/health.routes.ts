import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { HealthResponse } from "@tilbo/shared";

export async function healthRoutes(app: FastifyInstance) {
  // Healthy only if the database answers. The public reply never includes the error text.
  app.get("/api/health", async (req, reply): Promise<HealthResponse | void> => {
    try {
      await app.db.execute(sql`select 1`);
      return { status: "ok" };
    } catch (err) {
      req.log.error({ err }, "database health check failed");
      return reply.code(503).send({ status: "unavailable" });
    }
  });
}
