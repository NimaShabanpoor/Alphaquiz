import { requireAdmin } from "@/lib/admin-auth";
import { sendAttemptResultEmail } from "@/lib/result-email";
import { z } from "zod";

export const runtime = "nodejs";

const sendBodySchema = z
  .object({
    attemptId: z.string().trim().min(1).max(200),
    deliveryId: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = sendBodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Die Angaben für den E-Mail-Versand sind ungültig." },
      { status: 400 },
    );
  }
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const result = await sendAttemptResultEmail(
      auth.client,
      parsed.data.attemptId,
      parsed.data.deliveryId,
    );
    return Response.json(result);
  } catch (error) {
    console.error("[AlphaQuiz API] Ergebnis-E-Mail senden", error);
    return Response.json(
      { error: "Die Ergebnis-E-Mail konnte nicht versendet werden." },
      { status: 502 },
    );
  }
}
