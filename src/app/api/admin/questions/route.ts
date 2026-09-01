import { authorizeAdminMutation, databaseFailure, parseJsonPayload } from "@/lib/admin-api";
import { questionsPayloadSchema } from "@/lib/admin-resource-schemas";
import { syncQuestions } from "@/lib/admin-resource-sync";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const auth = await authorizeAdminMutation(request);
  if (auth.response) return auth.response;
  const parsed = await parseJsonPayload(request, questionsPayloadSchema);
  if (parsed.response) return parsed.response;
  try {
    await syncQuestions(auth.client, auth.user.id, parsed.data.questions);
    return Response.json({ saved: true });
  } catch (error) {
    return databaseFailure("Fragen speichern", error);
  }
}
