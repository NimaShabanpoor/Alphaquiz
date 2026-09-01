import assert from "node:assert/strict";
import test from "node:test";
import { generateExamInstance } from "../src/lib/exam-randomization";
import { calculateExamInstanceResult } from "../src/lib/exam-scoring";
import { toPublicExamQuestions } from "../src/lib/public-exam-dto";
import type { Question, Quiz } from "../src/lib/quiz-types";

const quiz: Quiz = {
  id: "quiz-security",
  title: "Sicherheitsprüfung",
  description: "",
  categoryId: "category-1",
  status: "ready",
  questionIds: ["question-1"],
  passPercentage: 70,
  scoringMode: "combined",
  topicPassPercentages: {},
  hiddenTopicIds: [],
  updatedAt: "2026-07-31T00:00:00.000Z",
};

const question: Question = {
  id: "question-1",
  title: "Was ist richtig?",
  description: "",
  type: "single",
  categoryId: "category-1",
  topicId: "",
  points: 1,
  shuffle: true,
  answers: [
    { id: "answer-1", text: "Richtig", correct: true },
    { id: "answer-2", text: "Falsch", correct: false },
  ],
};

function createInstance(questions: Question[] = [question]) {
  return generateExamInstance({
    attemptId: "attempt-security",
    publicationId: "publication-security",
    studentKey: "student@example.com",
    quiz: { ...quiz, questionIds: questions.map((item) => item.id) },
    questions,
    topics: [],
    config: {
      questionOrderMode: "fixed",
      useTopics: true,
      questionCountByTopic: {},
      shuffleAnswers: false,
      requiredQuestionIds: [],
      lockedQuestionIds: [],
      retryMode: "regenerate",
    },
  });
}

test("öffentliche Fragen enthalten keine Lösungsmarkierungen", () => {
  const publicQuestions = toPublicExamQuestions(createInstance());
  assert.equal(publicQuestions.length, 1);
  assert.deepEqual(publicQuestions[0].answers, [
    { id: "answer-1", text: "Richtig" },
    { id: "answer-2", text: "Falsch" },
  ]);
  assert.equal("correct" in publicQuestions[0].answers[0], false);
});

test("serverseitige Auswertung akzeptiert nur die gespeicherte Instanz", () => {
  const instance = createInstance();
  const correct = calculateExamInstanceResult(instance, {
    "question-1": ["answer-1"],
  });
  const wrong = calculateExamInstanceResult(instance, {
    "question-1": ["answer-2"],
  });
  assert.equal(correct.score, 1);
  assert.equal(correct.passed, true);
  assert.equal(wrong.score, 0);
  assert.equal(wrong.passed, false);
});

test("eine Prüfung ohne Fragen gilt nie als bestanden", () => {
  const instance = {
    ...createInstance(),
    questions: [],
    questionOrder: [],
  };
  const result = calculateExamInstanceResult(instance, {});
  assert.equal(result.possible, 0);
  assert.equal(result.percentage, 0);
  assert.equal(result.passed, false);
});
