import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuizState } from "@/lib/quiz-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function upsert(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict = "id",
) {
  if (!rows.length) return;
  const { error } = await client
    .from(table)
    .upsert(rows, { onConflict, ignoreDuplicates: false });
  if (error) throw new Error(`${table}: ${error.message}`);
}

export async function GET() {
  const current = getSupabaseAdmin();
  if (!current.client) {
    return Response.json({
      configured: current.configured,
      reachable: false,
      error: current.error,
    });
  }

  try {
    const { error } = await current.client
      .from("categories")
      .select("id")
      .limit(1);
    return Response.json({
      configured: true,
      reachable: !error,
      error:
        error?.code === "PGRST205" || error?.code === "42P01"
          ? "Die AlphaQuiz-Tabellen fehlen in Supabase. Führe supabase/schema.sql aus."
          : error?.message,
    });
  } catch (error) {
    return Response.json({
      configured: true,
      reachable: false,
      error: error instanceof Error ? error.message : "Verbindung fehlgeschlagen",
    });
  }
}

export async function POST(request: Request) {
  const current = getSupabaseAdmin();
  if (!current.client) {
    return Response.json(
      { error: current.error ?? "Supabase ist nicht vollständig konfiguriert." },
      { status: 503 },
    );
  }

  try {
    const state = (await request.json()) as QuizState;
    await upsert(current.client, "categories", state.categories);
    await upsert(current.client, "topics", state.topics);
    await Promise.all([
      upsert(
        current.client,
        "questions",
        state.questions.map((question) => ({
          id: question.id,
          title: question.title,
          description: question.description,
          image: question.image ?? null,
          type: question.type,
          categoryId: question.categoryId,
          topicId: question.topicId,
          points: question.points,
          shuffle: question.shuffle,
        })),
      ),
      upsert(
        current.client,
        "quizzes",
        state.quizzes.map((quiz) => ({
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          categoryId: quiz.categoryId,
          status: quiz.status,
          passPercentage: quiz.passPercentage,
          scoringMode: quiz.scoringMode,
          topicPassPercentages: quiz.topicPassPercentages,
          updatedAt: quiz.updatedAt,
        })),
      ),
      upsert(current.client, "exports", state.exports),
    ]);
    await Promise.all([
      upsert(
        current.client,
        "answers",
        state.questions.flatMap((question) =>
          question.answers.map((answer, position) => ({
            ...answer,
            questionId: question.id,
            position,
          })),
        ),
      ),
      upsert(
        current.client,
        "quiz_questions",
        state.quizzes.flatMap((quiz) =>
          quiz.questionIds.map((questionId, position) => ({
            quizId: quiz.id,
            questionId,
            position,
          })),
        ),
        "quizId,questionId",
      ),
    ]);
    await upsert(
      current.client,
      "exam_publications",
      state.examPublications,
    );
    await upsert(current.client, "exam_attempts", state.examAttempts);
    await upsert(current.client, "exam_events", state.examEvents);
    return Response.json({ synced: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supabase-Synchronisierung fehlgeschlagen.",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const publicationId = new URL(request.url).searchParams.get(
    "publicationId",
  );
  if (!publicationId) {
    return Response.json(
      { error: "Die Prüfungs-ID fehlt." },
      { status: 400 },
    );
  }

  const current = getSupabaseAdmin();
  if (!current.client) {
    return Response.json(
      { error: current.error ?? "Supabase ist nicht vollständig konfiguriert." },
      { status: 503 },
    );
  }

  const { error } = await current.client
    .from("exam_publications")
    .delete()
    .eq("id", publicationId);
  if (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
  return Response.json({ deleted: true });
}
