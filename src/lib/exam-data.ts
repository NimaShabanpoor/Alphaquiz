import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultExamRandomizationConfig,
  examTopicId,
} from "@/lib/exam-randomization";
import { toPublicExamQuestions } from "@/lib/public-exam-dto";
import type {
  ExamInstance,
  ExamPublication,
  ExamRandomizationConfig,
  PublicExamAttempt,
  PublicExamMetadata,
  Question,
  Quiz,
  Topic,
} from "@/lib/quiz-types";

export type ExamSource = {
  publication: ExamPublication;
  quiz: Quiz;
  questions: Question[];
  topics: Topic[];
};

export function normalizeExamPublication(
  row: Record<string, unknown>,
): ExamPublication {
  const rawRandomization =
    (row.randomization as Partial<ExamRandomizationConfig> | null) ?? {};
  return {
    id: String(row.id),
    quizId: String(row.quizId),
    slug: String(row.slug),
    mode: row.mode === "open-book" ? "open-book" : "closed",
    timeLimit: Number(row.timeLimit) || 45,
    maxViolations: Math.max(1, Number(row.maxViolations) || 1),
    active: Boolean(row.active),
    sendResults: Boolean(row.sendResults),
    randomization: {
      ...defaultExamRandomizationConfig(),
      ...rawRandomization,
      questionCountByTopic: {
        ...(rawRandomization.questionCountByTopic ?? {}),
      },
      requiredQuestionIds: [...(rawRandomization.requiredQuestionIds ?? [])],
      lockedQuestionIds: [...(rawRandomization.lockedQuestionIds ?? [])],
    },
    availableFrom: row.availableFrom ? String(row.availableFrom) : undefined,
    availableUntil: row.availableUntil
      ? String(row.availableUntil)
      : undefined,
    createdAt: String(row.createdAt),
  };
}

async function loadExamSource(
  client: SupabaseClient,
  column: "id" | "slug",
  value: string,
): Promise<ExamSource | null> {
  const { data: publicationRow, error: publicationError } = await client
    .from("exam_publications")
    .select("*")
    .eq(column, value)
    .maybeSingle();
  if (publicationError) throw new Error(publicationError.message);
  if (!publicationRow) return null;

  const publication = normalizeExamPublication(publicationRow);
  const { data: quizRow, error: quizError } = await client
    .from("quizzes")
    .select("*")
    .eq("id", publication.quizId)
    .maybeSingle();
  if (quizError) throw new Error(quizError.message);
  if (!quizRow) return null;

  const { data: links, error: linkError } = await client
    .from("quiz_questions")
    .select("questionId,position")
    .eq("quizId", publication.quizId)
    .order("position");
  if (linkError) throw new Error(linkError.message);

  const questionIds = (links ?? []).map((link) => String(link.questionId));
  const [questionResult, answerResult, topicResult] = await Promise.all([
    questionIds.length
      ? client.from("questions").select("*").in("id", questionIds)
      : Promise.resolve({ data: [], error: null }),
    questionIds.length
      ? client
          .from("answers")
          .select("*")
          .in("questionId", questionIds)
          .order("position")
      : Promise.resolve({ data: [], error: null }),
    client.from("topics").select("*"),
  ]);
  if (questionResult.error) throw new Error(questionResult.error.message);
  if (answerResult.error) throw new Error(answerResult.error.message);
  if (topicResult.error) throw new Error(topicResult.error.message);

  const answersByQuestion = new Map<string, Question["answers"]>();
  for (const answer of answerResult.data ?? []) {
    const questionId = String(answer.questionId);
    const current = answersByQuestion.get(questionId) ?? [];
    current.push({
      id: String(answer.id),
      text: String(answer.text),
      correct: Boolean(answer.correct),
    });
    answersByQuestion.set(questionId, current);
  }

  const questionById = new Map<string, Question>(
    (questionResult.data ?? []).map((question) => [
      String(question.id),
      {
        id: String(question.id),
        title: String(question.title),
        description: String(question.description ?? ""),
        image: question.image
          ? (question.image as Question["image"])
          : undefined,
        type: question.type as Question["type"],
        categoryId: String(question.categoryId ?? ""),
        topicId: String(question.topicId ?? ""),
        points: Number(question.points) || 1,
        shuffle: Boolean(question.shuffle),
        answers: answersByQuestion.get(String(question.id)) ?? [],
      } satisfies Question,
    ]),
  );

  const quiz: Quiz = {
    id: String(quizRow.id),
    title: String(quizRow.title),
    description: String(quizRow.description ?? ""),
    categoryId: String(quizRow.categoryId ?? ""),
    status: quizRow.status as Quiz["status"],
    questionIds,
    passPercentage: Number(quizRow.passPercentage) || 70,
    scoringMode:
      quizRow.scoringMode === "per-topic" ? "per-topic" : "combined",
    topicPassPercentages:
      (quizRow.topicPassPercentages as Record<string, number> | null) ?? {},
    hiddenTopicIds: Array.isArray(quizRow.hiddenTopicIds)
      ? (quizRow.hiddenTopicIds as string[])
      : [],
    updatedAt: String(quizRow.updatedAt),
  };

  return {
    publication,
    quiz,
    questions: questionIds.flatMap((questionId) => {
      const question = questionById.get(questionId);
      return question ? [question] : [];
    }),
    topics: (topicResult.data ?? []).map((topic) => ({
      id: String(topic.id),
      categoryId: String(topic.categoryId),
      name: String(topic.name),
    })),
  };
}

export function loadExamSourceBySlug(client: SupabaseClient, slug: string) {
  return loadExamSource(client, "slug", slug);
}

export function loadExamSourceByPublicationId(
  client: SupabaseClient,
  publicationId: string,
) {
  return loadExamSource(client, "id", publicationId);
}

export function toPublicExamMetadata(source: ExamSource): PublicExamMetadata {
  const availableByTopic = new Map<string, number>();
  for (const question of source.questions) {
    const topicId = examTopicId(
      question,
      source.quiz,
      source.publication.randomization.useTopics,
    );
    availableByTopic.set(topicId, (availableByTopic.get(topicId) ?? 0) + 1);
  }
  const questionCount = Array.from(availableByTopic).reduce(
    (total, [topicId, available]) =>
      total +
      (source.publication.randomization.questionCountByTopic[topicId] ??
        available),
    0,
  );

  return {
    id: source.publication.id,
    slug: source.publication.slug,
    title: source.quiz.title,
    description: source.quiz.description,
    mode: source.publication.mode,
    timeLimit: source.publication.timeLimit,
    maxViolations: source.publication.maxViolations,
    sendResults: source.publication.sendResults,
    active: source.publication.active,
    availableFrom: source.publication.availableFrom,
    availableUntil: source.publication.availableUntil,
    passPercentage: source.quiz.passPercentage,
    questionCount,
  };
}

export function toPublicExamAttempt(
  row: Record<string, unknown>,
  instance: ExamInstance,
): PublicExamAttempt {
  return {
    id: String(row.id),
    publicationId: String(row.publicationId),
    name: String(row.name),
    email: String(row.email),
    status: row.status as PublicExamAttempt["status"],
    startedAt: String(row.startedAt),
    submittedAt: row.submittedAt ? String(row.submittedAt) : undefined,
    currentQuestion: Number(row.currentQuestion) || 0,
    responses:
      (row.responses as Record<string, string[]> | null) ?? {},
    score: Number(row.score) || 0,
    possible: Number(row.possible) || 0,
    percentage: Number(row.percentage) || 0,
    passed: Boolean(row.passed),
    topicResults:
      (row.topicResults as PublicExamAttempt["topicResults"] | null) ?? [],
    violationCount: Number(row.violationCount) || 0,
    resultEmailStatus:
      (row.resultEmailStatus as PublicExamAttempt["resultEmailStatus"]) ??
      "pending",
    questions: toPublicExamQuestions(instance),
  };
}
