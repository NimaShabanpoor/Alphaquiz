import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ResetBody = {
  email?: string;
};

export async function POST(request: Request) {
  let body: ResetBody;
  try {
    body = (await request.json()) as ResetBody;
  } catch {
    return NextResponse.json(
      { error: "Ungültige Anfrage." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "Eine E-Mail-Adresse ist erforderlich." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase.client) {
    return NextResponse.json(
      { error: supabase.error || "Supabase ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const { error } = await supabase.client.auth.resetPasswordForEmail(email, {
    redirectTo: `${new URL(request.url).origin}/login`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Die Rücksetz-Mail konnte nicht versendet werden." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "Wenn das Konto existiert, wurde eine Rücksetz-Mail versendet.",
  });
}
