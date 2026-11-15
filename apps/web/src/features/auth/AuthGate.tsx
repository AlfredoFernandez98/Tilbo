import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMe, logout } from "../../lib/api.ts";
import { AuthForm } from "./AuthForm.tsx";

export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isPending, isError } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Drop everything, so the next user on this device cannot see this user's data.
      queryClient.clear();
      queryClient.setQueryData(["me"], null);
    },
  });

  if (isPending) return <p>Indlæser...</p>;
  if (isError) return <p role="alert">API svarer ikke</p>;
  if (!user) return <AuthForm />;
  return (
    <>
      <p>
        {user.name}{" "}
        <button type="button" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
          Log ud
        </button>
      </p>
      {logoutMutation.isError && <p role="alert">Kunne ikke logge ud. Prøv igen</p>}
      {children}
    </>
  );
}
