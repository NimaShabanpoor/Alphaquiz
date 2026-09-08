import { NextResponse } from "next/server";
import { z } from "zod";
import {
  attemptCookieName,
  createAttemptAccessToken,
} from "@/lib/exam-access";
import {
  loadExamSourceBySlug,
  toPublicExamAttempt,
  toPublicExamMetadata,
} from "@/lib/exam-data";
import {
  generateExamInstance,
  reuseExamInstance,
  validateExamRandomization,
} from "@/lib/exam-randomization";
import type { ExamInstance } from "@/lib/quiz-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { readExamSnapshot } from "@/lib/exam-snapshot";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const startSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  })
  .strict();

function unavailableMessage(
  active: boolean,
  availableFrom?: string,
  availableUntil?: string,
) {
  const now = Date.now();
  if (!active) return "Diese Prüfung ist derzeit nicht freigeschaltet.";
  if (availableFrom && now < new Date(availableFrom).getTime()) {
    return "Diese Prüfung ist noch nicht freigeschaltet.";
  }
  if (availableUntil && now > new Date(availableUntil).getTime()) {
    return "Der Zeitraum für diese Prüfung ist abgelaufen.";
  }
  return "";
}

export async function GET(request: Request, context: RouteContext) {
  const rateLimit = await checkRateLimit(
    request,
    "exam-metadata",
    20,
    5 * 60_000,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: rateLimit.unavailable
          ? "Der Prüfungsabruf ist vorübergehend nicht verfügbar."
          : "Zu viele Prüfungsabrufe. Bitte warte einen Moment.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const { slug } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase.client) {
    return Response.json(
      { error: "Die Prüfungsplattform ist noch nicht konfiguriert." },
      { status: 503 },
    );
  }

  try {
    const source = await loadExamSourceBySlug(supabase.client, slug);
    if (!source) {
      return Response.json(
        { error: "Prüfung nicht gefunden." },
        { status: 404 },
      );
    }
    return Response.json({ exam: toPublicExamMetadata(source) });
  } catch {
    return Response.json(
      {
        error: "Die Prüfung konnte nicht geladen werden.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  let parsed;
  try {
    parsed = startSchema.safeParse(await readJsonBody(request));
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return Response.json({ error: "Ungültige Startangaben." }, { status });
  }
  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Bitte gib deinen vollständigen Namen und eine gültige E-Mail-Adresse ein.",
      },
      { status: 400 },
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    "exam-start",
    15,
    15 * 60_000,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: rateLimit.unavailable
          ? "Der Prüfungsstart ist vorübergehend nicht verfügbar."
          : "Zu viele Startversuche. Bitte warte einen Moment.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const { slug } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase.client) {
    return Response.json(
      { error: "Die Prüfungsplattform ist noch nicht konfiguriert." },
      { status: 503 },
    );
  }

  try {
    const { name, email } = parsed.data;

    const source = await loadExamSourceBySlug(supabase.client, slug);
    if (!source) {
      return Response.json(
        { error: "Prüfung nicht gefunden." },
        { status: 404 },
      );
    }
    const unavailable = unavailableMessage(
      source.publication.active,
      source.publication.availableFrom,
      source.publication.availableUntil,
    );
    if (unavailable) {
      return Response.json({ error: unavailable }, { status: 403 });
    }

    const validationErrors = validateExamRandomization(
      source.quiz,
      source.questions,
      source.topics,
      source.publication.randomization,
    );
    if (validationErrors.length) {
      return Response.json(
        { error: validationErrors[0].message },
        { status: 409 },
      );
    }

    const { data: existing } = await supabase.client
      .from("exam_attempts")
      .select("id,status")
      .eq("publicationId", source.publication.id)
      .ilike("email", email)
      .neq("status", "reset")
      .limit(1)
      .maybeSingle();
    if (existing) {
      return Response.json(
        {
          error:
            existing.status === "in-progress"
              ? "Für diese E-Mail-Adresse läuft bereits ein Versuch."
              : "Für diese E-Mail-Adresse wurde der einzige Versuch bereits verwendet.",
        },
        { status: 409 },
      );
    }

    let previousInstance: ExamInstance | undefined;
    if (source.publication.randomization.retryMode === "reuse") {
      const { data: previousAttempt } = await supabase.client
        .from("exam_attempts")
        .select("id")
        .eq("publicationId", source.publication.id)
        .ilike("email", email)
        .eq("status", "reset")
        .order("startedAt", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (previousAttempt) {
        const { data: previous } = await supabase.client
          .from("exam_instances")
          .select("snapshot")
          .eq("attemptId", previousAttempt.id)
          .maybeSingle();
        previousInstance = previous?.snapshot ? readExamSnapshot(previous.snapshot) : undefined;
      }
    }

    const attemptId = `attempt-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();
    const access = createAttemptAccessToken();
    const instance = previousInstance
      ? reuseExamInstance(previousInstance, attemptId, startedAt)
      : generateExamInstance({
          attemptId,
          publicationId: source.publication.id,
          quiz: source.quiz,
          questions: source.questions,
          topics: source.topics,
          config: source.publication.randomization,
          generatedAt: startedAt,
        });

    const { data: attempt, error: attemptError } = await supabase.client
      .from("exam_attempts")
      .insert({
        id: attemptId,
        publicationId: source.publication.id,
        name,
        email,
        status: "in-progress",
        startedAt,
        currentQuestion: 0,
        responses: {},
        score: 0,
        possible: 0,
        percentage: 0,
        passed: false,
        topicResults: [],
        violationCount: 0,
        resultEmailStatus: "pending",
        accessTokenHash: access.hash,
        updatedAt: startedAt,
      })
      .select("*")
      .single();
    if (attemptError) {
      const duplicate = attemptError.code === "23505";
      if (!duplicate) {
        console.error("[AlphaQuiz Prüfung] Versuch konnte nicht erstellt werden", attemptError);
      }
      return Response.json(
        {
          error: duplicate
            ? "Für diese E-Mail-Adresse wurde der Versuch bereits gestartet."
            : "Der Prüfungsversuch konnte nicht erstellt werden.",
        },
        { status: duplicate ? 409 : 502 },
      );
    }

    const { error: instanceError } = await supabase.client
      .from("exam_instances")
      .insert({
        id: instance.id,
        attemptId,
        publicationId: instance.publicationId,
        quizId: instance.quizId,
        questionOrder: instance.questionOrder,
        topicOrder: instance.topicOrder,
        answerOrderByQuestionId: instance.answerOrderByQuestionId,
        snapshot: instance,
        seed: instance.seed,
        generatedAt: instance.generatedAt,
        previousAttemptId: instance.previousAttemptId ?? null,
      });
    if (instanceError) {
      await supabase.client.from("exam_attempts").delete().eq("id", attemptId);
      throw new Error(instanceError.message);
    }

    await supabase.client.from("exam_events").insert({
      id: `event-${crypto.randomUUID()}`,
      publicationId: source.publication.id,
      attemptId,
      type: "started",
      message: "Prüfung gestartet",
      createdAt: startedAt,
    });

    const response = NextResponse.json({
      exam: toPublicExamMetadata(source),
      attempt: toPublicExamAttempt(attempt, instance),
    });
    response.cookies.set(attemptCookieName(attemptId), access.token, {
      httpOnly: true,
      maxAge: Math.max(source.publication.timeLimit * 60 + 3600, 7200),
      path: `/api/public/exam-attempts/${attemptId}`,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("[AlphaQuiz Prüfung] Start fehlgeschlagen", error);
    return Response.json(
      {
        error: "Die Prüfung konnte nicht gestartet werden.",
      },
      { status: 500 },
    );
  }
}
