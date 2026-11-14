import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health.ts";

describe("healthResponseSchema", () => {
  it("accepts status ok", () => {
    expect(healthResponseSchema.parse({ status: "ok" })).toEqual({ status: "ok" });
  });

  it("rejects anything else", () => {
    expect(healthResponseSchema.safeParse({ status: "down" }).success).toBe(false);
  });
});
