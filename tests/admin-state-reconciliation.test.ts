import assert from "node:assert/strict";
import test from "node:test";
import {
  findMissingIds,
  findMissingQuizQuestionLinks,
  isQuizStatePayload,
} from "../src/lib/admin-state-reconciliation";

test("gelöschte IDs werden für den Datenbankabgleich erkannt", () => {
  assert.deepEqual(
    findMissingIds(["eins", "zwei", "drei"], ["eins", "drei"]),
    ["zwei"],
  );
});

test("gelöschte Quiz-Fragen-Verknüpfungen werden eindeutig erkannt", () => {
  const existing = [
    { quizId: "quiz-1", questionId: "frage-1" },
    { quizId: "quiz-1", questionId: "frage-2" },
    { quizId: "quiz-2", questionId: "frage-1" },
  ];
  const current = [
    { quizId: "quiz-1", questionId: "frage-1" },
    { quizId: "quiz-2", questionId: "frage-1" },
  ];
  assert.deepEqual(findMissingQuizQuestionLinks(existing, current), [
    { quizId: "quiz-1", questionId: "frage-2" },
  ]);
});

test("unvollständige Admin-Zustände werden abgelehnt", () => {
  assert.equal(isQuizStatePayload({ quizzes: [] }), false);
  assert.equal(
    isQuizStatePayload({
      categories: [],
      topics: [],
      questions: [],
      quizzes: [],
      exports: [],
      examPublications: [],
    }),
    true,
  );
});
