import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "@tilbo/shared";
import { buildApp } from "../../app.ts";
import { createDb } from "../../db/client.ts";

describe("GET /api/health", () => {
  it("svarer 200 med status ok, når databasen svarer", async () => {
    const app = buildApp(createDb("memory://"));
    const res = await app.inject({ method: "GET", url: "/api/health" });

    expect(res.statusCode).toBe(200);
    expect(healthResponseSchema.parse(res.json())).toEqual({ status: "ok" });
  });

  it("svarer 500, når databasen er lukket", async () => {
    const db = createDb("memory://");
    await db.$client.close();
    const res = await buildApp(db).inject({ method: "GET", url: "/api/health" });

    expect(res.statusCode).toBe(500);
  });
});
