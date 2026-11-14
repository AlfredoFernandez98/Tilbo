import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { HealthResponse } from "@tilbo/shared";

export async function healthRoutes(app: FastifyInstance) {
  // Svarer kun ok, hvis databasen også svarer. Fejl giver 500 via Fastifys standard-handler.
  app.get("/api/health", async (): Promise<HealthResponse> => {
    await app.db.execute(sql`select 1`);
    return { status: "ok" };
  });
}
