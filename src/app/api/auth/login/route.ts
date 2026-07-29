import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
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

  const supabase = getSupabaseAdmin();
  if (!supabase.client) {
    return NextResponse.json(
      { error: supabase.error || "Supabase ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: "E-Mail-Adresse oder Passwort ist falsch." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("alphaquiz-access-token", data.session.access_token, {
    httpOnly: true,
    maxAge: data.session.expires_in,
    path: "/",
    sameSite: "lax",
    secure,
  });
  response.cookies.set("alphaquiz-refresh-token", data.session.refresh_token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure,
  });

  return response;
}
