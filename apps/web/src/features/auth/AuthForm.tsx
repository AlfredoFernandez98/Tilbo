import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginBodySchema, signupBodySchema } from "@tilbo/shared";
import { login, signup } from "../../lib/api.ts";
import { authErrorMessage } from "./auth-error-message.ts";

export function AuthForm() {
  const [isSignup, setIsSignup] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const fields = Object.fromEntries(form);
      return isSignup ? signup(signupBodySchema.parse(fields)) : login(loginBodySchema.parse(fields));
    },
    onSuccess: (user) => queryClient.setQueryData(["me"], user),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>{isSignup ? "Opret konto" : "Log ind"}</h2>
      {isSignup && (
        <p>
          <label htmlFor="name">Navn</label>{" "}
          <input id="name" name="name" type="text" autoComplete="name" required maxLength={100} />
        </p>
      )}
      <p>
        <label htmlFor="email">E-mail</label>{" "}
        <input id="email" name="email" type="email" autoComplete="email" required />
      </p>
      <p>
        <label htmlFor="password">Adgangskode</label>{" "}
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
        />
      </p>
      {mutation.isError && <p role="alert">{authErrorMessage(mutation.error.message)}</p>}
      <button type="submit" disabled={mutation.isPending}>
        {isSignup ? "Opret konto" : "Log ind"}
      </button>{" "}
      <button
        type="button"
        onClick={() => {
          setIsSignup(!isSignup);
          mutation.reset();
        }}
      >
        {isSignup ? "Jeg har allerede en konto" : "Opret ny konto"}
      </button>
    </form>
  );
}
