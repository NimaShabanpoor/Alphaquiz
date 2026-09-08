import { redactedError } from "@/lib/error-redaction";
import { requireAdmin } from "@/lib/admin-auth";
import { databaseFailure } from "@/lib/admin-api";
import { loadOwnedExamPublication } from "@/lib/admin-ownership";
import { resourceIdSchema } from "@/lib/admin-resource-schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ publicationId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const params = await context.params;
  const parsedId = resourceIdSchema.safeParse(params.publicationId);
  if (!parsedId.success) {
    return Response.json({ error: "Die Prüfungs-ID ist ungültig." }, { status: 400 });
  }
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  try {
    const publication = await loadOwnedExamPublication(
      auth.client,
      auth.user.id,
      parsedId.data,
    );
    if (!publication) {
      return Response.json(
        { error: "Die Prüfungsveröffentlichung wurde nicht gefunden." },
        { status: 404 },
      );
    }

    const { data: deleted, error } = await auth.client
      .from("exam_publications")
      .delete()
      .eq("id", publication.id)
      .eq("quizId", publication.quizId)
      .select("id")
      .maybeSingle();
    if (error) throw redactedError(error);
    if (!deleted) {
      return Response.json(
        { error: "Die Prüfungsveröffentlichung wurde nicht gefunden." },
        { status: 404 },
      );
    }
    return Response.json({ deleted: true });
  } catch (error) {
    return databaseFailure("Prüfungsveröffentlichung löschen", error);
  }
}
