import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const JWT_SECRET = "test".repeat(8);

describe("loadConfig", () => {
  it("uses defaults for everything except the secret", () => {
    expect(loadConfig({ JWT_SECRET })).toEqual({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      PGLITE_DIR: ".pglite",
      JWT_SECRET,
      APP_ORIGIN: "http://localhost:5173",
    });
  });

  it("rejects an invalid port", () => {
    expect(() => loadConfig({ JWT_SECRET, PORT: "abc" })).toThrow();
  });

  it("refuses to start without a long enough JWT secret", () => {
    expect(() => loadConfig({})).toThrow();
    expect(() => loadConfig({ JWT_SECRET: "short" })).toThrow();
  });
});
