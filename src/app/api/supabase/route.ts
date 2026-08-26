import { isQuizStatePayload } from "@/lib/admin-state-reconciliation";
import { loadAdminState, loadExamActivity } from "@/lib/admin-state";
import { syncAdminState } from "@/lib/admin-state-sync";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("state") === "1") {
      return Response.json({ state: await loadAdminState(auth.client) });
    }
    if (searchParams.get("activity") === "1") {
      return Response.json(await loadExamActivity(auth.client));
    }

    const { error } = await auth.client
      .from("categories")
      .select("id")
      .limit(1);
    return Response.json({
      configured: true,
      reachable: !error,
      error:
        error?.code === "PGRST205" || error?.code === "42P01"
          ? "Die AlphaQuiz-Tabellen fehlen in Supabase. Führe supabase/schema.sql aus."
          : error?.message,
    });
  } catch (error) {
    return Response.json({
      configured: true,
      reachable: false,
      error: error instanceof Error ? error.message : "Verbindung fehlgeschlagen",
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const payload: unknown = await request.json();
    if (!isQuizStatePayload(payload)) {
      return Response.json(
        { error: "Die übermittelten AlphaQuiz-Daten sind ungültig." },
        { status: 400 },
      );
    }
    await syncAdminState(auth.client, auth.user.id, payload);
    return Response.json({ synced: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supabase-Synchronisierung fehlgeschlagen.",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const publicationId = new URL(request.url).searchParams.get(
    "publicationId",
  );
  if (!publicationId) {
    return Response.json(
      { error: "Die Prüfungs-ID fehlt." },
      { status: 400 },
    );
  }

  const { error } = await auth.client
    .from("exam_publications")
    .delete()
    .eq("id", publicationId);
  if (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
  return Response.json({ deleted: true });
}
