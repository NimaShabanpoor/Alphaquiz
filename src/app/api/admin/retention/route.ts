import { requireAdmin } from "@/lib/admin-auth";
import { databaseFailure } from "@/lib/admin-api";
import { runExamRetention } from "@/lib/exam-retention";
import { readRetentionConfig } from "@/lib/exam-retention-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  try {
    return Response.json(await runExamRetention(auth.client, readRetentionConfig()));
  } catch (error) {
    return databaseFailure("Aufbewahrungslöschung", error);
  }
}
