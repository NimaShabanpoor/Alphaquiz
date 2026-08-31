import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedAdminEmail } from "@/lib/admin-auth";
import { trustedMutationOrigin } from "@/lib/app-origin";
import {
  checkIdentifierRateLimit,
  checkRateLimit,
} from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z
  .object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(1_024),
  })
  .strict();

export async function POST(request: Request) {
  if (!trustedMutationOrigin(request)) {
    return NextResponse.json(
      { error: "Diese Anfrage stammt nicht von AlphaQuiz." },
      { status: 403 },
    );
  }

  let parsed;
  try {
    parsed = loginSchema.safeParse(await readJsonBody(request));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "Ungültige Anmeldedaten." }, { status });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "E-Mail-Adresse oder Passwort ist ungültig." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const [networkRateLimit, emailRateLimit] = await Promise.all([
    checkRateLimit(request, "admin-login-network", 10, 15 * 60_000),
    checkIdentifierRateLimit("admin-login-email", email, 10, 15 * 60_000),
  ]);
  const blockedRateLimit = [networkRateLimit, emailRateLimit].find(
    (result) => !result.allowed,
  );
  if (blockedRateLimit) {
    return NextResponse.json(
      {
        error: blockedRateLimit.unavailable
          ? "Die Anmeldung ist vorübergehend nicht verfügbar."
          : "Zu viele Anmeldeversuche. Bitte warte einen Moment.",
      },
      {
        status: blockedRateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(blockedRateLimit.retryAfter) },
      },
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
