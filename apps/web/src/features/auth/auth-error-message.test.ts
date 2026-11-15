import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-error-message.ts";

describe("authErrorMessage", () => {
  it("has one message for a failed login", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("Forkert e-mail eller adgangskode");
  });

  it("explains that the email is already in use", () => {
    expect(authErrorMessage("email_taken")).toBe("Der findes allerede en konto med den e-mail");
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(authErrorMessage("API returned 502")).toBe("Noget gik galt. Prøv igen");
  });
});
