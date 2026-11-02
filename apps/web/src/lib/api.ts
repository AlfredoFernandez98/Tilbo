import { healthResponseSchema, type HealthResponse } from "@tilbo/shared";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`API svarede ${res.status}`);
  return healthResponseSchema.parse(await res.json());
}
