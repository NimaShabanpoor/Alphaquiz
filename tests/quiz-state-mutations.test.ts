import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteExamPublicationFromState,
  deleteQuestionFromState,
  deleteQuizFromState,
} from "../src/lib/quiz-state-mutations";
import type { QuizState } from "../src/lib/quiz-types";

function stateFixture(): QuizState {
  return {
    categories: [{ id: "category", name: "Excel", color: "#fff" }],
    topics: [{ id: "topic", categoryId: "category", name: "Grundlagen" }],
    questions: [
      {
        id: "question",
        title: "Frage",
        description: "",
        type: "single",
        categoryId: "category",
        topicId: "topic",
        points: 1,
        shuffle: true,
        answers: [{ id: "answer", text: "Antwort", correct: true }],
      },
    ],
    quizzes: [
      {
        id: "quiz",
        title: "Quiz",
        description: "",
        categoryId: "category",
        status: "draft",
        questionIds: ["question"],
        passPercentage: 70,
        scoringMode: "combined",
        topicPassPercentages: {},
        hiddenTopicIds: [],
        updatedAt: "2026-07-31T00:00:00.000Z",
      },
    ],
    exports: [
      {
        id: "export",
        quizId: "quiz",
        format: "pdf",
        fileName: "quiz.pdf",
        createdAt: "2026-07-31T00:00:00.000Z",
      },
    ],
    examPublications: [
      {
        id: "publication",
        quizId: "quiz",
        slug: "quiz-link",
        mode: "closed",
        timeLimit: 45,
        maxViolations: 2,
        active: true,
        sendResults: true,
        randomization: {
          questionOrderMode: "fixed",
          useTopics: true,
          questionCountByTopic: {},
          shuffleAnswers: false,
          requiredQuestionIds: [],
          lockedQuestionIds: [],
          retryMode: "regenerate",
        },
        createdAt: "2026-07-31T00:00:00.000Z",
      },
    ],
    examAttempts: [
      {
        id: "attempt",
        publicationId: "publication",
        name: "Test Person",
        email: "test@example.com",
        status: "submitted",
        startedAt: "2026-07-31T00:00:00.000Z",
        currentQuestion: 0,
        responses: {},
        score: 1,
        possible: 1,
        percentage: 100,
        passed: true,
        topicResults: [],
        violationCount: 0,
        resultEmailStatus: "sent",
      },
    ],
    examEvents: [
      {
        id: "event",
        publicationId: "publication",
        attemptId: "attempt",
        type: "submitted",
        message: "Abgegeben",
        createdAt: "2026-07-31T00:00:00.000Z",
      },
    ],
  };
}

test("Fragen werden auch aus allen Quizzes entfernt", () => {
  const next = deleteQuestionFromState(stateFixture(), "question");
  assert.equal(next.questions.length, 0);
  assert.deepEqual(next.quizzes[0].questionIds, []);
});

test("Prüfungsveröffentlichungen entfernen abhängige Versuche und Ereignisse", () => {
  const next = deleteExamPublicationFromState(
    stateFixture(),
    "publication",
  );
  assert.equal(next.examPublications.length, 0);
  assert.equal(next.examAttempts.length, 0);
  assert.equal(next.examEvents.length, 0);
});

test("Quiz-Löschung entfernt abhängige Exporte und Prüfungsdaten", () => {
  const next = deleteQuizFromState(stateFixture(), "quiz");
  assert.equal(next.quizzes.length, 0);
  assert.equal(next.exports.length, 0);
  assert.equal(next.examPublications.length, 0);
  assert.equal(next.examAttempts.length, 0);
  assert.equal(next.examEvents.length, 0);
});
