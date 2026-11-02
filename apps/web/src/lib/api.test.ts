import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "./api.ts";

afterEach(() => vi.unstubAllGlobals());

describe("fetchHealth", () => {
  it("returnerer svaret når API'et er oppe", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "ok" })));
    await expect(fetchHealth()).resolves.toEqual({ status: "ok" });
  });

  it("fejler når API'et svarer med en fejlkode", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 502 })));
    await expect(fetchHealth()).rejects.toThrow("API svarede 502");
  });
});
