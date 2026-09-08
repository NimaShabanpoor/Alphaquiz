import "server-only";
import { readExamSnapshot } from "@/lib/exam-snapshot";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeExamPublication } from "@/lib/exam-data";
import type {
  Answer,
  ExamAttempt,
  ExamEvent,
  Question,
  Quiz,
  QuizState,
} from "@/lib/quiz-types";

export async function loadExamActivity(client: SupabaseClient) {
  const [attemptResult, instanceResult, eventResult] = await Promise.all([
    client.from("exam_attempts").select("*").order("startedAt", {
      ascending: false,
    }),
    client.from("exam_instances").select("attemptId,snapshot"),
    client.from("exam_events").select("*").order("createdAt", {
      ascending: false,
    }),
  ]);
  if (attemptResult.error) throw new Error(attemptResult.error.message);
  if (instanceResult.error) throw new Error(instanceResult.error.message);
  if (eventResult.error) throw new Error(eventResult.error.message);

  const instanceByAttempt = new Map(
    (instanceResult.data ?? []).map((row) => [
      String(row.attemptId),
      readExamSnapshot(row.snapshot),
    ]),
  );
  const attempts: ExamAttempt[] = (attemptResult.data ?? []).map((row) => ({
    id: String(row.id),
    publicationId: String(row.publicationId),
    name: String(row.name),
    email: String(row.email),
    status: row.status as ExamAttempt["status"],
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
      (row.topicResults as ExamAttempt["topicResults"] | null) ?? [],
    violationCount: Number(row.violationCount) || 0,
    resultEmailStatus:
      (row.resultEmailStatus as ExamAttempt["resultEmailStatus"]) ?? "pending",
    instance: instanceByAttempt.get(String(row.id)),
  }));
  const events: ExamEvent[] = (eventResult.data ?? []).map((row) => ({
    id: String(row.id),
    publicationId: String(row.publicationId),
    attemptId: String(row.attemptId),
    type: row.type as ExamEvent["type"],
    message: String(row.message),
    createdAt: String(row.createdAt),
  }));
  return { attempts, events };
}

export async function loadAdminState(
  client: SupabaseClient,
): Promise<QuizState> {
  const [
    categoryResult,
    topicResult,
    questionResult,
    answerResult,
    quizResult,
    linkResult,
    exportResult,
    publicationResult,
    activity,
  ] = await Promise.all([
    client.from("categories").select("*"),
    client.from("topics").select("*"),
    client.from("questions").select("*"),
    client.from("answers").select("*").order("position"),
    client.from("quizzes").select("*").order("updatedAt", {
      ascending: false,
    }),
    client.from("quiz_questions").select("*").order("position"),
    client.from("exports").select("*").order("createdAt", {
      ascending: false,
    }),
    client.from("exam_publications").select("*").order("createdAt", {
      ascending: false,
    }),
    loadExamActivity(client),
  ]);

  const errors = [
    categoryResult.error,
    topicResult.error,
    questionResult.error,
    answerResult.error,
    quizResult.error,
    linkResult.error,
    exportResult.error,
    publicationResult.error,
  ].filter(Boolean);
  if (errors.length) throw new Error(errors[0]!.message);

  const answersByQuestion = new Map<string, Answer[]>();
  for (const row of answerResult.data ?? []) {
    const questionId = String(row.questionId);
    const current = answersByQuestion.get(questionId) ?? [];
    current.push({
      id: String(row.id),
      text: String(row.text),
      correct: Boolean(row.correct),
    });
    answersByQuestion.set(questionId, current);
  }

  const linksByQuiz = new Map<string, string[]>();
  for (const row of linkResult.data ?? []) {
    const quizId = String(row.quizId);
    const current = linksByQuiz.get(quizId) ?? [];
    current.push(String(row.questionId));
    linksByQuiz.set(quizId, current);
  }

  const questions: Question[] = (questionResult.data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    image: row.image ? (row.image as Question["image"]) : undefined,
    type: row.type as Question["type"],
    categoryId: String(row.categoryId ?? ""),
    topicId: String(row.topicId ?? ""),
    points: Number(row.points) || 1,
    shuffle: Boolean(row.shuffle),
    answers: answersByQuestion.get(String(row.id)) ?? [],
  }));
  const quizzes: Quiz[] = (quizResult.data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    categoryId: String(row.categoryId ?? ""),
    status: row.status as Quiz["status"],
    questionIds: linksByQuiz.get(String(row.id)) ?? [],
    passPercentage: Number(row.passPercentage) || 70,
    scoringMode:
      row.scoringMode === "per-topic" ? "per-topic" : "combined",
    topicPassPercentages:
      (row.topicPassPercentages as Record<string, number> | null) ?? {},
    hiddenTopicIds: Array.isArray(row.hiddenTopicIds)
      ? (row.hiddenTopicIds as string[])
      : [],
    updatedAt: String(row.updatedAt),
  }));

  return {
    categories: (categoryResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      color: String(row.color),
    })),
    topics: (topicResult.data ?? []).map((row) => ({
      id: String(row.id),
      categoryId: String(row.categoryId),
      name: String(row.name),
    })),
    questions,
    quizzes,
    exports: (exportResult.data ?? []).map((row) => ({
      id: String(row.id),
      quizId: String(row.quizId),
      format: String(row.format),
      fileName: String(row.fileName),
      createdAt: String(row.createdAt),
    })),
    examPublications: (publicationResult.data ?? []).map((row) =>
      normalizeExamPublication(row),
    ),
    examAttempts: activity.attempts,
    examEvents: activity.events,
  };
}
