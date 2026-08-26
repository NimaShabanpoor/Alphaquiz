import { authorizeAdminMutation, databaseFailure, parseJsonPayload } from "@/lib/admin-api";
import { quizzesPayloadSchema } from "@/lib/admin-resource-schemas";
import { syncQuizzes } from "@/lib/admin-resource-sync";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const parsed = await parseJsonPayload(request, quizzesPayloadSchema);
  if (parsed.response) return parsed.response;
  const auth = await authorizeAdminMutation(request);
  if (auth.response) return auth.response;
  try {
    await syncQuizzes(auth.client, auth.user.id, parsed.data.quizzes);
    return Response.json({ saved: true });
  } catch (error) {
    return databaseFailure("Quizzes speichern", error);
  }
}
