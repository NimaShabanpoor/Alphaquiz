import { NextResponse } from "next/server";
import { trustedMutationOrigin } from "@/lib/app-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!trustedMutationOrigin(request)) {
    return NextResponse.json(
      { error: "Diese Anfrage stammt nicht von AlphaQuiz." },
      { status: 403 },
    );
  }
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
