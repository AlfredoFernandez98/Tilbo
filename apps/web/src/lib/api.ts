import {
  healthResponseSchema,
  userResponseSchema,
  type HealthResponse,
  type LoginBody,
  type SignupBody,
  type UserResponse,
} from "@tilbo/shared";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return healthResponseSchema.parse(await res.json());
}

// The message is the API's error code ({ error: "code" }), or the status when there is none.
async function apiError(res: Response): Promise<Error> {
  const body: { error?: unknown } | null = await res.json().catch(() => null);
  return new Error(typeof body?.error === "string" ? body.error : `API returned ${res.status}`);
}

async function postForUser(path: string, body: unknown): Promise<UserResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res);
  return userResponseSchema.parse(await res.json());
}

export const signup = (body: SignupBody) => postForUser("/api/auth/signup", body);

export const login = (body: LoginBody) => postForUser("/api/auth/login", body);

export async function logout(): Promise<void> {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  if (!res.ok) throw await apiError(res);
}

// Resolves to null when nobody is logged in.
export async function fetchMe(): Promise<UserResponse | null> {
  const res = await fetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw await apiError(res);
  return userResponseSchema.parse(await res.json());
}
