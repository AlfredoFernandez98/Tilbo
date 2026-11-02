import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client.ts";
import { HealthStatus } from "./features/health/HealthStatus.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <h1>Tilbo</h1>
      <HealthStatus />
    </QueryClientProvider>
  </StrictMode>,
);
