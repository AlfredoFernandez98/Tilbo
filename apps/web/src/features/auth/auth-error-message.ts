// Maps an API error code to Danish UI text.
export function authErrorMessage(code: string): string {
  // One message for unknown email and wrong password, so the form does not reveal which emails exist.
  if (code === "invalid_credentials") return "Forkert e-mail eller adgangskode";
  if (code === "email_taken") return "Der findes allerede en konto med den e-mail";
  return "Noget gik galt. Prøv igen";
}
