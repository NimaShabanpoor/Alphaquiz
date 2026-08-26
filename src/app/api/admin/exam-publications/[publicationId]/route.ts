import { requireAdmin } from "@/lib/admin-auth";
import { databaseFailure } from "@/lib/admin-api";
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
    const { error } = await auth.client
      .from("exam_publications")
      .delete()
      .eq("id", parsedId.data);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    return databaseFailure("Prüfungsveröffentlichung löschen", error);
  }
}
