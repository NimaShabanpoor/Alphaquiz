import { requireAdmin } from "@/lib/admin-auth";
import { databaseReadFailure } from "@/lib/admin-api";
import { loadExamActivity } from "@/lib/admin-state";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  try {
    return Response.json(await loadExamActivity(auth.client));
  } catch (error) {
    return databaseReadFailure("Prüfungsaktivität laden", error);
  }
}
