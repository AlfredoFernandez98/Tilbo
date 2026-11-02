import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "@tilbo/shared";
import { buildApp } from "../../app.ts";

describe("GET /api/health", () => {
  it("svarer 200 med status ok", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/health" });

    expect(res.statusCode).toBe(200);
    expect(healthResponseSchema.parse(res.json())).toEqual({ status: "ok" });
  });
});
