import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth, fetchMe, login, logout, signup } from "./api.ts";

afterEach(() => vi.unstubAllGlobals());

const user = { id: "0b0e7c1e-58f4-4d6c-9f5e-2a4b8c1d3e5f", name: "Anna", email: "anna@example.com" };

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchHealth", () => {
  it("returns the response when the API is up", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "ok" })));
    await expect(fetchHealth()).resolves.toEqual({ status: "ok" });
  });

  it("fails when the API returns an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 502 })));
    await expect(fetchHealth()).rejects.toThrow("API returned 502");
  });
});

describe("signup", () => {
  it("posts the body as JSON and returns the user", async () => {
    const fetchMock = stubFetch(Response.json(user, { status: 201 }));
    const body = { name: "Anna", email: "anna@example.com", password: "example-password" };

    await expect(signup(body)).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it("fails with the API's error code", async () => {
    stubFetch(Response.json({ error: "email_taken" }, { status: 409 }));
    const body = { name: "Anna", email: "anna@example.com", password: "example-password" };
    await expect(signup(body)).rejects.toThrow("email_taken");
  });
});

describe("login", () => {
  const body = { email: "anna@example.com", password: "example-password" };

  it("posts the body as JSON and returns the user", async () => {
    const fetchMock = stubFetch(Response.json(user));

    await expect(login(body)).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it("fails with the API's error code", async () => {
    stubFetch(Response.json({ error: "invalid_credentials" }, { status: 401 }));
    await expect(login(body)).rejects.toThrow("invalid_credentials");
  });

  it("fails with the status when the reply has no error code", async () => {
    stubFetch(new Response("Bad Gateway", { status: 502 }));
    await expect(login(body)).rejects.toThrow("API returned 502");
  });
});

describe("logout", () => {
  it("posts to the logout endpoint", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("fails when the API returns an error status", async () => {
    stubFetch(Response.json({ error: "forbidden_origin" }, { status: 403 }));
    await expect(logout()).rejects.toThrow("forbidden_origin");
  });
});

describe("fetchMe", () => {
  it("returns the user when logged in", async () => {
    const fetchMock = stubFetch(Response.json(user));
    await expect(fetchMe()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me");
  });

  it("returns null when not logged in", async () => {
    stubFetch(Response.json({ error: "unauthorized" }, { status: 401 }));
    await expect(fetchMe()).resolves.toBeNull();
  });

  it("fails on other error statuses", async () => {
    stubFetch(Response.json({ error: "internal" }, { status: 500 }));
    await expect(fetchMe()).rejects.toThrow("internal");
  });
});
