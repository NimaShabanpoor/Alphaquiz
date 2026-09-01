import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultExamRandomizationConfig,
  generateExamInstance,
  reuseExamInstance,
  validateExamRandomization,
} from "../src/lib/exam-randomization";
import type {
  ExamRandomizationConfig,
  Question,
  Quiz,
  Topic,
} from "../src/lib/quiz-types";
import { QUIZ_UNASSIGNED_TOPIC_ID } from "../src/lib/quiz-types";

const topics: Topic[] = [
  { id: "topic-a", categoryId: "cat", name: "Grundlagen" },
  { id: "topic-b", categoryId: "cat", name: "Formeln" },
];

function question(id: string, topicId: string): Question {
  return {
    id,
    title: `Frage ${id}`,
    description: "",
    type: "single",
    categoryId: "cat",
    topicId,
    points: 1,
    shuffle: true,
    answers: [
      { id: `${id}-a`, text: "A", correct: true },
      { id: `${id}-b`, text: "B", correct: false },
      { id: `${id}-c`, text: "C", correct: false },
      { id: `${id}-d`, text: "D", correct: false },
    ],
  };
}

const questions = [
  question("a1", "topic-a"),
  question("a2", "topic-a"),
  question("a3", "topic-a"),
  question("a4", "topic-a"),
  question("b1", "topic-b"),
  question("b2", "topic-b"),
  question("b3", "topic-b"),
  question("b4", "topic-b"),
  question("u1", ""),
  question("u2", ""),
];

const quiz: Quiz = {
  id: "quiz",
  title: "Test",
  description: "",
  categoryId: "cat",
  status: "ready",
  questionIds: questions.map((item) => item.id),
  passPercentage: 70,
  scoringMode: "combined",
  topicPassPercentages: {},
  hiddenTopicIds: [],
  updatedAt: "2026-07-30T08:00:00.000Z",
};

function config(
  patch: Partial<ExamRandomizationConfig> = {},
): ExamRandomizationConfig {
  return {
    ...defaultExamRandomizationConfig(),
    ...patch,
    questionCountByTopic: {
      ...(patch.questionCountByTopic ?? {}),
    },
    requiredQuestionIds: [...(patch.requiredQuestionIds ?? [])],
    lockedQuestionIds: [...(patch.lockedQuestionIds ?? [])],
  };
}

function generate(
  currentConfig: ExamRandomizationConfig,
  seed = "seed-1",
  attemptId = "attempt-1",
) {
  return generateExamInstance({
    attemptId,
    publicationId: "publication",
    studentKey: "student@example.com",
    quiz,
    questions,
    topics,
    config: currentConfig,
    seed,
    generatedAt: "2026-07-30T08:05:00.000Z",
  });
}

test("feste Reihenfolge bleibt unverändert", () => {
  const instance = generate(config({ questionOrderMode: "fixed" }));
  assert.deepEqual(instance.questionOrder, quiz.questionIds);
});

test("alle Fragen werden vollständig gemischt", () => {
  const instance = generate(
    config({ questionOrderMode: "shuffle-all" }),
    "shuffle-all",
  );
  assert.deepEqual(
    [...instance.questionOrder].sort(),
    [...quiz.questionIds].sort(),
  );
  assert.notDeepEqual(instance.questionOrder, quiz.questionIds);
});

test("innerhalb von Unterkategorien bleibt die Themenreihenfolge erhalten", () => {
  const instance = generate(
    config({ questionOrderMode: "shuffle-within-topics" }),
    "within-topics",
  );
  assert.deepEqual(instance.topicOrder, [
    "topic-a",
    "topic-b",
    QUIZ_UNASSIGNED_TOPIC_ID,
  ]);
  assert.notDeepEqual(instance.questionOrder.slice(0, 4), [
    "a1",
    "a2",
    "a3",
    "a4",
  ]);
});

test("Unterkategorien und Fragen werden gemischt", () => {
  const instance = generate(
    config({ questionOrderMode: "shuffle-topics-and-questions" }),
    "topic-shuffle",
  );
  assert.deepEqual(
    [...instance.topicOrder].sort(),
    ["topic-a", "topic-b", QUIZ_UNASSIGNED_TOPIC_ID].sort(),
  );
  assert.notDeepEqual(instance.topicOrder, [
    "topic-a",
    "topic-b",
    QUIZ_UNASSIGNED_TOPIC_ID,
  ]);
});

test("zufällige Auswahl hält die Anzahl pro Unterkategorie exakt ein", () => {
  const instance = generate(
    config({
      questionCountByTopic: {
        "topic-a": 2,
        "topic-b": 3,
        [QUIZ_UNASSIGNED_TOPIC_ID]: 1,
      },
    }),
  );
  const counts = instance.questions.reduce<Record<string, number>>(
    (result, item) => {
      const key = item.topicId || QUIZ_UNASSIGNED_TOPIC_ID;
      result[key] = (result[key] ?? 0) + 1;
      return result;
    },
    {},
  );
  assert.deepEqual(counts, {
    "topic-a": 2,
    "topic-b": 3,
    [QUIZ_UNASSIGNED_TOPIC_ID]: 1,
  });
});

test("Fragen ohne Unterkategorie werden unterstützt", () => {
  const instance = generate(
    config({
      questionCountByTopic: {
        "topic-a": 0,
        "topic-b": 0,
        [QUIZ_UNASSIGNED_TOPIC_ID]: 2,
      },
    }),
  );
  assert.deepEqual(instance.questionOrder, ["u1", "u2"]);
});

test("verpflichtende Fragen sind immer enthalten", () => {
  const instance = generate(
    config({
      questionCountByTopic: {
        "topic-a": 1,
        "topic-b": 1,
        [QUIZ_UNASSIGNED_TOPIC_ID]: 1,
      },
      requiredQuestionIds: ["a4", "b3"],
    }),
  );
  assert.ok(instance.questionOrder.includes("a4"));
  assert.ok(instance.questionOrder.includes("b3"));
});

test("geschützte Fragen bleiben an ihrem ausgewählten Grundplatz", () => {
  const instance = generate(
    config({
      questionOrderMode: "shuffle-all",
      lockedQuestionIds: ["a2", "b2"],
    }),
    "locked",
  );
  assert.equal(instance.questionOrder[1], "a2");
  assert.equal(instance.questionOrder[5], "b2");
});

test("Antwortoptionen werden optional gemischt", () => {
  const instance = generate(
    config({ shuffleAnswers: true }),
    "answers",
  );
  assert.notDeepEqual(instance.answerOrderByQuestionId.a1, [
    "a1-a",
    "a1-b",
    "a1-c",
    "a1-d",
  ]);
});

test("Neuladen erzeugt mit derselben Versuchs-ID dieselbe Reihenfolge", () => {
  const currentConfig = config({ questionOrderMode: "shuffle-all" });
  const first = generate(currentConfig, "publication:attempt", "attempt");
  const reloaded = generate(
    currentConfig,
    "publication:attempt",
    "attempt",
  );
  assert.deepEqual(reloaded.questionOrder, first.questionOrder);
  assert.deepEqual(
    reloaded.answerOrderByQuestionId,
    first.answerOrderByQuestionId,
  );
});

test("Fortsetzen verwendet die gespeicherte Instanz", () => {
  const first = generate(
    config({ questionOrderMode: "shuffle-all", shuffleAnswers: true }),
  );
  const restored = JSON.parse(JSON.stringify(first)) as typeof first;
  assert.deepEqual(restored.questionOrder, first.questionOrder);
  assert.deepEqual(
    restored.answerOrderByQuestionId,
    first.answerOrderByQuestionId,
  );
  assert.deepEqual(
    restored.questions.map((question) => question.id),
    first.questions.map((question) => question.id),
  );
});

test("neuer Versuch kann dieselbe Auswahl wiederverwenden", () => {
  const first = generate(
    config({ questionOrderMode: "shuffle-all", retryMode: "reuse" }),
  );
  const next = reuseExamInstance(
    first,
    "attempt-2",
    "student@example.com",
    "2026-07-30T09:00:00.000Z",
  );
  assert.deepEqual(next.questionOrder, first.questionOrder);
  assert.deepEqual(
    next.answerOrderByQuestionId,
    first.answerOrderByQuestionId,
  );
  assert.equal(next.previousAttemptId, first.attemptId);
});

test("neuer Versuch kann eine neue Auswahl erzeugen", () => {
  const currentConfig = config({
    questionOrderMode: "shuffle-all",
    retryMode: "regenerate",
  });
  const first = generate(currentConfig, "attempt-one", "attempt-1");
  const next = generate(currentConfig, "attempt-two", "attempt-2");
  assert.notDeepEqual(next.questionOrder, first.questionOrder);
});

test("zu hohe konfigurierte Fragenanzahl wird abgelehnt", () => {
  const errors = validateExamRandomization(
    quiz,
    questions,
    topics,
    config({ questionCountByTopic: { "topic-a": 5 } }),
  );
  assert.match(errors[0]?.message ?? "", /nur 4 Fragen verfügbar/);
});

test("mehr verpflichtende als erlaubte Fragen werden abgelehnt", () => {
  const errors = validateExamRandomization(
    quiz,
    questions,
    topics,
    config({
      questionCountByTopic: { "topic-a": 1 },
      requiredQuestionIds: ["a1", "a2"],
    }),
  );
  assert.match(errors[0]?.message ?? "", /2 verpflichtende Fragen/);
});

test("parallele Generierungen derselben Versuchs-ID sind idempotent", async () => {
  const currentConfig = config({ questionOrderMode: "shuffle-all" });
  const [first, second] = await Promise.all([
    Promise.resolve(generate(currentConfig, "same", "same-attempt")),
    Promise.resolve(generate(currentConfig, "same", "same-attempt")),
  ]);
  assert.deepEqual(first.questionOrder, second.questionOrder);
  assert.deepEqual(
    first.answerOrderByQuestionId,
    second.answerOrderByQuestionId,
  );
});

test("nachträgliche Quizänderungen verändern die Instanz nicht", () => {
  const instance = generate(config());
  const originalTitle = instance.questions[0]?.title;
  questions[0].title = "Nachträglich geändert";
  quiz.questionIds.reverse();
  assert.equal(instance.questions[0]?.title, originalTitle);
  assert.notDeepEqual(instance.questionOrder, quiz.questionIds);
  questions[0].title = "Frage a1";
  quiz.questionIds.reverse();
});
