import { authorizeAdminMutation, databaseFailure, parseJsonPayload } from "@/lib/admin-api";
import { exportsPayloadSchema } from "@/lib/admin-resource-schemas";
import { syncExports } from "@/lib/admin-resource-sync";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const parsed = await parseJsonPayload(request, exportsPayloadSchema);
  if (parsed.response) return parsed.response;
  const auth = await authorizeAdminMutation(request);
  if (auth.response) return auth.response;
  try {
    await syncExports(auth.client, auth.user.id, parsed.data.exports);
    return Response.json({ saved: true });
  } catch (error) {
    return databaseFailure("Exporte speichern", error);
  }
}
