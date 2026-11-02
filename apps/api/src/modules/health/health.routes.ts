import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "@tilbo/shared";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async (): Promise<HealthResponse> => ({ status: "ok" }));
}
