import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "@tilbo/shared";
import { buildApp } from "../../app.ts";
import { createDb } from "../../db/client.ts";

describe("GET /api/health", () => {
  it("returns 200 with status ok when the database answers", async () => {
    const app = buildApp(createDb("memory://"));
    const res = await app.inject({ method: "GET", url: "/api/health" });

    expect(res.statusCode).toBe(200);
    expect(healthResponseSchema.parse(res.json())).toEqual({ status: "ok" });
    await app.close();
  });

  it("returns 503 without error details when the database is closed", async () => {
    const db = createDb("memory://");
    await db.$client.close();
    const res = await buildApp(db).inject({ method: "GET", url: "/api/health" });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: "unavailable" });
  });
});
