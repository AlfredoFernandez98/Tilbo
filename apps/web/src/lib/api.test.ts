import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "./api.ts";

afterEach(() => vi.unstubAllGlobals());

describe("fetchHealth", () => {
  it("returns the response when the API is up", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "ok" })));
    await expect(fetchHealth()).resolves.toEqual({ status: "ok" });
  });

  it("fails when the API answers with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 502 })));
    await expect(fetchHealth()).rejects.toThrow("API answered 502");
  });
});
