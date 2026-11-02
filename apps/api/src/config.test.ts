import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

describe("loadConfig", () => {
  it("bruger standardværdier", () => {
    expect(loadConfig({})).toEqual({ NODE_ENV: "development", HOST: "127.0.0.1", PORT: 3000 });
  });

  it("afviser en ugyldig port", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow();
  });
});
