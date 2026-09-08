import { redactedError } from "@/lib/error-redaction";
import { requireAdmin } from "@/lib/admin-auth";
import { databaseFailure } from "@/lib/admin-api";
import { loadOwnedExamAttempt } from "@/lib/admin-ownership";
import { resourceIdSchema } from "@/lib/admin-resource-schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  const parsedId = resourceIdSchema.safeParse(params.attemptId);
  if (!parsedId.success) {
    return Response.json({ error: "Die Versuchs-ID ist ungültig." }, { status: 400 });
  }
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const attemptId = parsedId.data;
    const attempt = await loadOwnedExamAttempt(
      auth.client,
      auth.user.id,
      attemptId,
    );
    if (!attempt) {
      return Response.json(
        { error: "Der Prüfungsversuch wurde nicht gefunden." },
        { status: 404 },
      );
    }
    if (attempt.status === "in-progress") {
      return Response.json(
        { error: "Ein laufender Versuch kann nicht freigegeben werden." },
        { status: 409 },
      );
    }

    const updatedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await auth.client
      .from("exam_attempts")
      .update({ status: "reset", updatedAt })
      .eq("id", attemptId)
      .eq("publicationId", attempt.publicationId)
      .select("id")
      .maybeSingle();
    if (updateError) throw redactedError(updateError);
    if (!updated) {
      return Response.json(
        { error: "Der Prüfungsversuch wurde nicht gefunden." },
        { status: 404 },
      );
    }

    const { error: eventError } = await auth.client
      .from("exam_events")
      .insert({
        id: `event-${crypto.randomUUID()}`,
        publicationId: attempt.publicationId,
        attemptId,
        type: "reset",
        message: "Versuch durch Administrator freigegeben",
        createdAt: updatedAt,
      });
    if (eventError) throw redactedError(eventError);

    return Response.json({ reset: true });
  } catch (error) {
    return databaseFailure("Prüfungsversuch freigeben", error);
  }
}
