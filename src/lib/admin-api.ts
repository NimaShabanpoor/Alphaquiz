import { redactError } from "@/lib/error-redaction";
import "server-only";

import type { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { formatValidationError } from "@/lib/admin-resource-schemas";

export async function parseJsonPayload<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return {
      data: null,
      response: Response.json(
        { error: "Die Anfrage enthält kein gültiges JSON." },
        { status: 400 },
      ),
    } as const;
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    return {
      data: null,
      response: Response.json(
        { error: formatValidationError(result.error) },
        { status: 400 },
      ),
    } as const;
  }
  return { data: result.data, response: null } as const;
}

export async function authorizeAdminMutation(request: Request) {
  return requireAdmin(request);
}

export function databaseFailure(scope: string, error: unknown) {
  console.error(`[AlphaQuiz API] ${scope}`, redactError(error));
  return Response.json(
    { error: "Die Daten konnten nicht in Supabase gespeichert werden." },
    { status: 502 },
  );
}

export function databaseReadFailure(scope: string, error: unknown) {
  console.error(`[AlphaQuiz API] ${scope}`, redactError(error));
  return Response.json(
    { error: "Die Daten konnten nicht aus Supabase geladen werden." },
    { status: 502 },
  );
}
