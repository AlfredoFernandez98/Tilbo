import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health.ts";

describe("healthResponseSchema", () => {
  it("godtager status ok", () => {
    expect(healthResponseSchema.parse({ status: "ok" })).toEqual({ status: "ok" });
  });

  it("afviser alt andet", () => {
    expect(healthResponseSchema.safeParse({ status: "down" }).success).toBe(false);
  });
});
