import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ResetBody = {
  email?: string;
};

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "password-reset", 5, 60 * 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuche es später erneut." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }
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

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (
    (process.env.NODE_ENV === "production" && !adminEmail) ||
    (adminEmail && email !== adminEmail)
  ) {
    return NextResponse.json({
      message: "Wenn das Konto existiert, wurde eine Rücksetz-Mail versendet.",
    });
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
