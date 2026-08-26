import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const { attemptId } = await context.params;
  const { data: attempt, error: readError } = await auth.client
    .from("exam_attempts")
    .select("id,publicationId,status")
    .eq("id", attemptId)
    .maybeSingle();
  if (readError) {
    return Response.json({ error: readError.message }, { status: 502 });
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
    return Response.json({ error: updateError.message }, { status: 502 });
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
    return Response.json({ error: eventError.message }, { status: 502 });
  }

  return Response.json({ reset: true });
}
