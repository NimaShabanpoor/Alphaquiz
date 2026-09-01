import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  try {
    const { error } = await auth.client.from("categories").select("id").limit(1);
    if (error) {
      console.error("[AlphaQuiz API] Supabase-Status", error);
      return Response.json(
        {
          configured: true,
          reachable: false,
          error: "Supabase ist konfiguriert, aber der Datenzugriff ist nicht möglich.",
        },
        { status: 502 },
      );
    }
    return Response.json({ configured: true, reachable: true });
  } catch (error) {
    console.error("[AlphaQuiz API] Supabase-Status", error);
    return Response.json(
      {
        configured: true,
        reachable: false,
        error: "Supabase ist momentan nicht erreichbar.",
      },
      { status: 502 },
    );
  }
}
