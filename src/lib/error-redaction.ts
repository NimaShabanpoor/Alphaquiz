const messages: Record<string, string> = {
  "23505": "Ein eindeutiger Datensatz ist bereits vorhanden.",
  "23503": "Eine referenzierte Zeile ist nicht verfügbar.",
  "23502": "Ein erforderlicher Datenbankwert fehlt.",
  "23514": "Eine Datenbankbedingung wurde verletzt.",
  "42501": "Der Datenbankzugriff wurde verweigert.",
  "42P01": "Eine benötigte Tabelle ist nicht verfügbar.",
  "42703": "Eine benötigte Spalte ist nicht verfügbar.",
};

// Never trust a provider's message either: PostgreSQL can include row values in
// message as well as details/hint. Retain the diagnostic code, not free text.
export function redactError(error: unknown): { code: string; message: string } {
  const descriptor = error && typeof error === "object"
    ? Object.getOwnPropertyDescriptor(error, "code") : undefined;
  const rawCode: unknown = descriptor?.value;
  const code = typeof rawCode === "string" && /^(?:[0-9][A-Z0-9]{4}|PGRST[0-9]{3})$/.test(rawCode)
    ? rawCode : "UNKNOWN";
  return { code, message: messages[code] ?? "Ein Dienst- oder Verarbeitungsfehler ist aufgetreten." };
}

export function redactedError(error: unknown): Error & { code: string } {
  const safe = redactError(error);
  return Object.assign(new Error(safe.message), { code: safe.code });
}
