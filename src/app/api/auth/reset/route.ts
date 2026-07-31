import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

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
