import { requireAdmin } from "@/lib/admin-auth";
import { databaseReadFailure } from "@/lib/admin-api";
import { loadAdminState } from "@/lib/admin-state";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  try {
    return Response.json({ state: await loadAdminState(auth.client) });
  } catch (error) {
    return databaseReadFailure("Admin-Zustand laden", error);
  }
}
