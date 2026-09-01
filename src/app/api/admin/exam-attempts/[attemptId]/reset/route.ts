import { requireAdmin } from "@/lib/admin-auth";
import { databaseFailure } from "@/lib/admin-api";
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

  const attemptId = parsedId.data;
  const { data: attempt, error: readError } = await auth.client
    .from("exam_attempts")
    .select("id,publicationId,status")
    .eq("id", attemptId)
    .maybeSingle();
  if (readError) {
    return databaseFailure("Prüfungsversuch laden", readError);
  }
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
  const { error: updateError } = await auth.client
    .from("exam_attempts")
    .update({ status: "reset", updatedAt })
    .eq("id", attemptId);
  if (updateError) {
    return databaseFailure("Prüfungsversuch freigeben", updateError);
  }

  const { error: eventError } = await auth.client
    .from("exam_events")
    .insert({
      id: `event-${crypto.randomUUID()}`,
      publicationId: String(attempt.publicationId),
      attemptId,
      type: "reset",
      message: "Versuch durch Administrator freigegeben",
      createdAt: updatedAt,
    });
  if (eventError) {
    return databaseFailure("Freigabe protokollieren", eventError);
  }

  return Response.json({ reset: true });
}
