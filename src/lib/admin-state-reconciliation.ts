import type { QuizState } from "@/lib/quiz-types";

export type QuizQuestionLink = {
  questionId: string;
  quizId: string;
};

export function isQuizStatePayload(value: unknown): value is QuizState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Record<keyof QuizState, unknown>>;
  return [
    candidate.categories,
    candidate.topics,
    candidate.questions,
    candidate.quizzes,
    candidate.exports,
    candidate.examPublications,
  ].every(Array.isArray);
}

export function findMissingIds(
  existingIds: string[],
  currentIds: string[],
) {
  const current = new Set(currentIds);
  return existingIds.filter((id) => !current.has(id));
}

function linkKey(link: QuizQuestionLink) {
  return `${link.quizId}\u0000${link.questionId}`;
}

export function findMissingQuizQuestionLinks(
  existing: QuizQuestionLink[],
  current: QuizQuestionLink[],
) {
  const currentKeys = new Set(current.map(linkKey));
  return existing.filter((link) => !currentKeys.has(linkKey(link)));
}
