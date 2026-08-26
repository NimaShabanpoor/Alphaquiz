import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  ExamPublication,
  ExportRecord,
  Question,
  Quiz,
  Topic,
} from "@/lib/quiz-types";

type AdminTable =
  | "answers"
  | "categories"
  | "exam_publications"
  | "exports"
  | "questions"
  | "quizzes"
  | "topics";

async function upsertRows(
  client: SupabaseClient,
  table: AdminTable | "quiz_questions",
  rows: Record<string, unknown>[],
  onConflict = "id",
) {
  if (!rows.length) return;
  const { error } = await client
    .from(table)
    .upsert(rows, { onConflict, ignoreDuplicates: false });
  if (error) throw error;
}

async function deleteMissingIds(
  client: SupabaseClient,
  table: AdminTable,
  currentIds: string[],
) {
  const { data, error } = await client.from(table).select("id");
  if (error) throw error;
  const current = new Set(currentIds);
  const missing = (data ?? [])
    .map((row) => String(row.id))
    .filter((id) => !current.has(id));
  if (!missing.length) return;
  const { error: deleteError } = await client.from(table).delete().in("id", missing);
  if (deleteError) throw deleteError;
}

async function replaceQuizQuestionLinks(
  client: SupabaseClient,
  quizzes: Quiz[],
) {
  const links = quizzes.flatMap((quiz) =>
    quiz.questionIds.map((questionId, position) => ({
      quizId: quiz.id,
      questionId,
      position,
    })),
  );
  const { data, error } = await client
    .from("quiz_questions")
    .select("quizId,questionId");
  if (error) throw error;
  const current = new Set(links.map((link) => `${link.quizId}\u0000${link.questionId}`));
  for (const row of data ?? []) {
    const quizId = String(row.quizId);
    const questionId = String(row.questionId);
    if (current.has(`${quizId}\u0000${questionId}`)) continue;
    const { error: deleteError } = await client
      .from("quiz_questions")
      .delete()
      .eq("quizId", quizId)
      .eq("questionId", questionId);
    if (deleteError) throw deleteError;
  }
  await upsertRows(client, "quiz_questions", links, "quizId,questionId");
}

export async function syncCategories(
  client: SupabaseClient,
  userId: string,
  categories: Category[],
) {
  await upsertRows(
    client,
    "categories",
    categories.map((category) => ({
      id: category.id,
      user_id: userId,
      name: category.name,
      color: category.color,
    })),
  );
  await deleteMissingIds(client, "categories", categories.map((item) => item.id));
}

export async function syncTopics(client: SupabaseClient, topics: Topic[]) {
  await upsertRows(
    client,
    "topics",
    topics.map((topic) => ({
      id: topic.id,
      categoryId: topic.categoryId,
      name: topic.name,
    })),
  );
  await deleteMissingIds(client, "topics", topics.map((item) => item.id));
}

export async function syncQuestions(
  client: SupabaseClient,
  userId: string,
  questions: Question[],
) {
  await upsertRows(
    client,
    "questions",
    questions.map((question) => ({
      id: question.id,
      user_id: userId,
      title: question.title,
      description: question.description,
      image: question.image
        ? {
            dataUrl: question.image.dataUrl,
            fileName: question.image.fileName,
            alt: question.image.alt,
          }
        : null,
      type: question.type,
      categoryId: question.categoryId || null,
      topicId: question.topicId || null,
      points: question.points,
      shuffle: question.shuffle,
    })),
  );
  const answers = questions.flatMap((question) =>
    question.answers.map((answer, position) => ({
      id: answer.id,
      questionId: question.id,
      text: answer.text,
      correct: answer.correct,
      position,
    })),
  );
  await upsertRows(client, "answers", answers);
  await deleteMissingIds(client, "answers", answers.map((item) => item.id));
  await deleteMissingIds(client, "questions", questions.map((item) => item.id));
}

export async function syncQuizzes(
  client: SupabaseClient,
  userId: string,
  quizzes: Quiz[],
) {
  await upsertRows(
    client,
    "quizzes",
    quizzes.map((quiz) => ({
      id: quiz.id,
      user_id: userId,
      title: quiz.title,
      description: quiz.description,
      categoryId: quiz.categoryId || null,
      status: quiz.status,
      passPercentage: quiz.passPercentage,
      scoringMode: quiz.scoringMode,
      topicPassPercentages: quiz.topicPassPercentages,
      hiddenTopicIds: quiz.hiddenTopicIds,
      updatedAt: quiz.updatedAt,
    })),
  );
  await replaceQuizQuestionLinks(client, quizzes);
  await deleteMissingIds(client, "quizzes", quizzes.map((item) => item.id));
}

export async function syncExports(
  client: SupabaseClient,
  userId: string,
  exports: ExportRecord[],
) {
  await upsertRows(
    client,
    "exports",
    exports.map((record) => ({
      id: record.id,
      user_id: userId,
      quizId: record.quizId,
      format: record.format,
      fileName: record.fileName,
      createdAt: record.createdAt,
    })),
  );
  await deleteMissingIds(client, "exports", exports.map((item) => item.id));
}

export async function syncExamPublications(
  client: SupabaseClient,
  publications: ExamPublication[],
) {
  await upsertRows(
    client,
    "exam_publications",
    publications.map((publication) => ({
      id: publication.id,
      quizId: publication.quizId,
      slug: publication.slug,
      mode: publication.mode,
      timeLimit: publication.timeLimit,
      maxViolations: publication.maxViolations,
      active: publication.active,
      sendResults: publication.sendResults,
      randomization: {
        questionOrderMode: publication.randomization.questionOrderMode,
        useTopics: publication.randomization.useTopics,
        questionCountByTopic: publication.randomization.questionCountByTopic,
        shuffleAnswers: publication.randomization.shuffleAnswers,
        requiredQuestionIds: publication.randomization.requiredQuestionIds,
        lockedQuestionIds: publication.randomization.lockedQuestionIds,
        retryMode: publication.randomization.retryMode,
      },
      availableFrom: publication.availableFrom || null,
      availableUntil: publication.availableUntil || null,
      createdAt: publication.createdAt,
    })),
  );
  await deleteMissingIds(
    client,
    "exam_publications",
    publications.map((item) => item.id),
  );
}
