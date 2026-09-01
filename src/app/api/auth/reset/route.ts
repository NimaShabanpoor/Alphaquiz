import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppOrigin, trustedMutationOrigin } from "@/lib/app-origin";
import { checkRateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const resetSchema = z
  .object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
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
    parsed = resetSchema.safeParse(await readJsonBody(request));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
      { status: 400 },
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    "password-reset",
    5,
    60 * 60_000,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.unavailable
          ? "Die Passwortfunktion ist vorübergehend nicht verfügbar."
          : "Zu viele Anfragen. Bitte versuche es später erneut.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }
  const { email } = parsed.data;

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
    redirectTo: `${getAppOrigin()}/login`,
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
