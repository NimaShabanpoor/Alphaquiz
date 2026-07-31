import type { QuizState } from "@/lib/quiz-types";

export function deleteQuizFromState(state: QuizState, quizId: string) {
  const publicationIds = new Set(
    state.examPublications
      .filter((publication) => publication.quizId === quizId)
      .map((publication) => publication.id),
  );
  const attemptIds = new Set(
    state.examAttempts
      .filter((attempt) => publicationIds.has(attempt.publicationId))
      .map((attempt) => attempt.id),
  );
  return {
    ...state,
    quizzes: state.quizzes.filter((quiz) => quiz.id !== quizId),
    exports: state.exports.filter((record) => record.quizId !== quizId),
    examPublications: state.examPublications.filter(
      (publication) => publication.quizId !== quizId,
    ),
    examAttempts: state.examAttempts.filter(
      (attempt) => !publicationIds.has(attempt.publicationId),
    ),
    examEvents: state.examEvents.filter(
      (event) =>
        !publicationIds.has(event.publicationId) &&
        !attemptIds.has(event.attemptId),
    ),
  } satisfies QuizState;
}

export function deleteQuestionFromState(
  state: QuizState,
  questionId: string,
) {
  return {
    ...state,
    questions: state.questions.filter(
      (question) => question.id !== questionId,
    ),
    quizzes: state.quizzes.map((quiz) => ({
      ...quiz,
      questionIds: quiz.questionIds.filter((id) => id !== questionId),
    })),
  } satisfies QuizState;
}

export function deleteExamPublicationFromState(
  state: QuizState,
  publicationId: string,
) {
  const attemptIds = new Set(
    state.examAttempts
      .filter((attempt) => attempt.publicationId === publicationId)
      .map((attempt) => attempt.id),
  );
  return {
    ...state,
    examPublications: state.examPublications.filter(
      (publication) => publication.id !== publicationId,
    ),
    examAttempts: state.examAttempts.filter(
      (attempt) => attempt.publicationId !== publicationId,
    ),
    examEvents: state.examEvents.filter(
      (event) =>
        event.publicationId !== publicationId &&
        !attemptIds.has(event.attemptId),
    ),
  } satisfies QuizState;
}
