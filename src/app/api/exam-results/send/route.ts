import { requireAdmin } from "@/lib/admin-auth";
import { sendAttemptResultEmail } from "@/lib/result-email";

export const runtime = "nodejs";

type SendBody = {
  attemptId?: string;
  deliveryId?: string;
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as SendBody;
    if (!body.attemptId) {
      return Response.json(
        { error: "Die Versuchs-ID fehlt." },
        { status: 400 },
      );
    }
    const result = await sendAttemptResultEmail(
      auth.client,
      body.attemptId,
      body.deliveryId,
    );
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Die Ergebnis-E-Mail konnte nicht versendet werden.",
      },
      { status: 502 },
    );
  }
}
