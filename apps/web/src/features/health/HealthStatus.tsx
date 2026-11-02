import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../../lib/api.ts";

export function HealthStatus() {
  const { data, isPending, isError } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  if (isPending) return <p>Tjekker API...</p>;
  if (isError) return <p>API svarer ikke</p>;
  return <p>API: {data.status}</p>;
}
