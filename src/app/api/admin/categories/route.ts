import { authorizeAdminMutation, databaseFailure, parseJsonPayload } from "@/lib/admin-api";
import { categoriesPayloadSchema } from "@/lib/admin-resource-schemas";
import { syncCategories } from "@/lib/admin-resource-sync";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const parsed = await parseJsonPayload(request, categoriesPayloadSchema);
  if (parsed.response) return parsed.response;
  const auth = await authorizeAdminMutation(request);
  if (auth.response) return auth.response;
  try {
    await syncCategories(auth.client, auth.user.id, parsed.data.categories);
    return Response.json({ saved: true });
  } catch (error) {
    return databaseFailure("Kategorien speichern", error);
  }
}
