import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findMissingIds,
  findMissingQuizQuestionLinks,
  type QuizQuestionLink,
} from "@/lib/admin-state-reconciliation";
import type { QuizState } from "@/lib/quiz-types";

type AdminTable =
  | "answers"
  | "categories"
  | "exam_publications"
  | "exports"
  | "questions"
  | "quizzes"
  | "topics";

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

async function deleteMissingById(
  client: SupabaseClient,
  table: AdminTable,
  currentIds: string[],
) {
  const { data, error } = await client.from(table).select("id");
  if (error) throw new Error(`${table}: ${error.message}`);
  const missing = findMissingIds(
    (data ?? []).map((row) => String(row.id)),
    currentIds,
  );
  if (!missing.length) return;
  const { error: deleteError } = await client
    .from(table)
    .delete()
    .in("id", missing);
  if (deleteError) throw new Error(`${table}: ${deleteError.message}`);
}

async function deleteMissingQuizQuestionLinks(
  client: SupabaseClient,
  current: QuizQuestionLink[],
) {
  const { data, error } = await client
    .from("quiz_questions")
    .select("quizId,questionId");
  if (error) throw new Error(`quiz_questions: ${error.message}`);
  const existing = (data ?? []).map((row) => ({
    quizId: String(row.quizId),
    questionId: String(row.questionId),
  }));
  const missing = findMissingQuizQuestionLinks(existing, current);
  const results = await Promise.all(
    missing.map((link) =>
      client
        .from("quiz_questions")
        .delete()
        .eq("quizId", link.quizId)
        .eq("questionId", link.questionId),
    ),
  );
  const deleteError = results.find((result) => result.error)?.error;
  if (deleteError) {
    throw new Error(`quiz_questions: ${deleteError.message}`);
  }
}

export async function syncAdminState(
  client: SupabaseClient,
  userId: string,
  state: QuizState,
) {
  const answers = state.questions.flatMap((question) =>
    question.answers.map((answer, position) => ({
      ...answer,
      questionId: question.id,
      position,
    })),
  );
  const quizQuestionLinks = state.quizzes.flatMap((quiz) =>
    quiz.questionIds.map((questionId, position) => ({
      quizId: quiz.id,
      questionId,
      position,
    })),
  );

  await upsert(
    client,
    "categories",
    state.categories.map((category) => ({
      id: category.id,
      user_id: userId,
      name: category.name,
      color: category.color,
    })),
  );
  await upsert(client, "topics", state.topics);
  await Promise.all([
    upsert(
      client,
      "questions",
      state.questions.map((question) => ({
        id: question.id,
        user_id: userId,
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
      client,
      "quizzes",
      state.quizzes.map((quiz) => ({
        id: quiz.id,
        user_id: userId,
        title: quiz.title,
        description: quiz.description,
        categoryId: quiz.categoryId,
        status: quiz.status,
        passPercentage: quiz.passPercentage,
        scoringMode: quiz.scoringMode,
        topicPassPercentages: quiz.topicPassPercentages,
        hiddenTopicIds: quiz.hiddenTopicIds,
        updatedAt: quiz.updatedAt,
      })),
    ),
  ]);
  await Promise.all([
    upsert(client, "answers", answers),
    upsert(client, "quiz_questions", quizQuestionLinks, "quizId,questionId"),
    upsert(
      client,
      "exports",
      state.exports.map((record) => ({
        id: record.id,
        user_id: userId,
        quizId: record.quizId,
        format: record.format,
        fileName: record.fileName,
        createdAt: record.createdAt,
      })),
    ),
  ]);
  await upsert(
    client,
    "exam_publications",
    state.examPublications.map((publication) => ({
      ...publication,
      availableFrom: publication.availableFrom || null,
      availableUntil: publication.availableUntil || null,
    })),
  );

  // Abhängige Datensätze werden zuerst entfernt, damit Fremdschlüssel
  // anschliessend keine verwaisten Inhalte blockieren.
  await Promise.all([
    deleteMissingById(
      client,
      "answers",
      answers.map((answer) => answer.id),
    ),
    deleteMissingQuizQuestionLinks(client, quizQuestionLinks),
    deleteMissingById(
      client,
      "exports",
      state.exports.map((record) => record.id),
    ),
    deleteMissingById(
      client,
      "exam_publications",
      state.examPublications.map((publication) => publication.id),
    ),
  ]);
  await Promise.all([
    deleteMissingById(
      client,
      "questions",
      state.questions.map((question) => question.id),
    ),
    deleteMissingById(
      client,
      "quizzes",
      state.quizzes.map((quiz) => quiz.id),
    ),
  ]);
  await deleteMissingById(
    client,
    "topics",
    state.topics.map((topic) => topic.id),
  );
  await deleteMissingById(
    client,
    "categories",
    state.categories.map((category) => category.id),
  );
}
