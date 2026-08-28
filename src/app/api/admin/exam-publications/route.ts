import { authorizeAdminMutation, databaseFailure, parseJsonPayload } from "@/lib/admin-api";
import { examPublicationsPayloadSchema } from "@/lib/admin-resource-schemas";
import { syncExamPublications } from "@/lib/admin-resource-sync";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const auth = await authorizeAdminMutation(request);
  if (auth.response) return auth.response;
  const parsed = await parseJsonPayload(request, examPublicationsPayloadSchema);
  if (parsed.response) return parsed.response;
  try {
    await syncExamPublications(
      auth.client,
      auth.user.id,
      parsed.data.examPublications,
    );
    return Response.json({ saved: true });
  } catch (error) {
    return databaseFailure("Prüfungsveröffentlichungen speichern", error);
  }
}
