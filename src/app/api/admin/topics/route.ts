import { authorizeAdminMutation, databaseFailure, parseJsonPayload } from "@/lib/admin-api";
import { topicsPayloadSchema } from "@/lib/admin-resource-schemas";
import { syncTopics } from "@/lib/admin-resource-sync";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const parsed = await parseJsonPayload(request, topicsPayloadSchema);
  if (parsed.response) return parsed.response;
  const auth = await authorizeAdminMutation(request);
  if (auth.response) return auth.response;
  try {
    await syncTopics(auth.client, parsed.data.topics);
    return Response.json({ saved: true });
  } catch (error) {
    return databaseFailure("Unterkategorien speichern", error);
  }
}
