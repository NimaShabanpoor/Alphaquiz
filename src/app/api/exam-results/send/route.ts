import { redactError } from "@/lib/error-redaction";
import { requireAdmin } from "@/lib/admin-auth";
import { loadOwnedExamAttempt } from "@/lib/admin-ownership";
import { sendAttemptResultEmail } from "@/lib/result-email";
import { checkRateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { z } from "zod";

export const runtime = "nodejs";

const sendBodySchema = z
  .object({
    attemptId: z.string().trim().min(1).max(200),
    deliveryId: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return Response.json(
      { error: "Die Angaben für den E-Mail-Versand sind ungültig." },
      { status },
    );
  }
  const parsed = sendBodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Die Angaben für den E-Mail-Versand sind ungültig." },
      { status: 400 },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    "result-email",
    30,
    60 * 60_000,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: rateLimit.unavailable
          ? "Der E-Mail-Versand ist vorübergehend nicht verfügbar."
          : "Zu viele E-Mails. Bitte versuche es später erneut.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  try {
    const attempt = await loadOwnedExamAttempt(
      auth.client,
      auth.user.id,
      parsed.data.attemptId,
    );
    if (!attempt) {
      return Response.json(
        { error: "Das Prüfungsresultat wurde nicht gefunden." },
        { status: 404 },
      );
    }
    const result = await sendAttemptResultEmail(
      auth.client,
      attempt.id,
      parsed.data.deliveryId,
    );
    return Response.json(result);
  } catch (error) {
    console.error("[AlphaQuiz API] Ergebnis-E-Mail senden", redactError(error));
    return Response.json(
      { error: "Die Ergebnis-E-Mail konnte nicht versendet werden." },
      { status: 502 },
    );
  }
}
