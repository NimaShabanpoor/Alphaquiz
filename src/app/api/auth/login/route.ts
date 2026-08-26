import { NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "admin-login", 10, 15 * 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anmeldeversuche. Bitte warte einen Moment." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { error: "Ungültige Anmeldedaten." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "E-Mail-Adresse und Passwort sind erforderlich." },
      { status: 400 },
    );
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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: "E-Mail-Adresse oder Passwort ist falsch." },
      { status: 401 },
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const verifiedEmail = userData.user?.email?.trim().toLowerCase();
  if (userError || !userData.user || !verifiedEmail) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Die Anmeldung konnte nicht verifiziert werden." },
      { status: 401 },
    );
  }

  if (!isAllowedAdminEmail(verifiedEmail)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          "Dieses Konto ist nicht als AlphaQuiz-Administrator freigeschaltet.",
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    user: {
      id: userData.user.id,
      email: verifiedEmail,
    },
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });

  return response;
}
