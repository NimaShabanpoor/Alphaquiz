import assert from "node:assert/strict";
import test from "node:test";
import {
  categoriesPayloadSchema,
  examPublicationsPayloadSchema,
  exportsPayloadSchema,
  questionsPayloadSchema,
  quizzesPayloadSchema,
  topicsPayloadSchema,
} from "../src/lib/admin-resource-schemas";

test("Ressourcen-Payloads verwerfen fremde Ownership-Felder", () => {
  const result = categoriesPayloadSchema.safeParse({
    categories: [
      { id: "category-1", name: "Excel", color: "#123456", user_id: "foreign" },
    ],
  });
  assert.equal(result.success, false);
});

test("Fragen werden vollständig und typisiert validiert", () => {
  const valid = questionsPayloadSchema.safeParse({
    questions: [
      {
        id: "question-1",
        title: "Was ist eine Zelle?",
        description: "",
        type: "single",
        categoryId: "category-1",
        topicId: "topic-1",
        points: 1,
        shuffle: true,
        answers: [
          { id: "answer-1", text: "Eine Tabelleneinheit", correct: true },
        ],
      },
    ],
  });
  assert.equal(valid.success, true);

  const invalid = questionsPayloadSchema.safeParse({
    questions: [{ id: "question-1", title: "Unvollständig" }],
  });
  assert.equal(invalid.success, false);
});

test("leere Vollersatz-Payloads verlangen eine ausdrückliche Löschbestätigung", () => {
  const replacements = [
    ["categories", categoriesPayloadSchema],
    ["topics", topicsPayloadSchema],
    ["questions", questionsPayloadSchema],
    ["quizzes", quizzesPayloadSchema],
    ["exports", exportsPayloadSchema],
    ["examPublications", examPublicationsPayloadSchema],
  ] as const;

  for (const [key, schema] of replacements) {
    const rejected = schema.safeParse({ [key]: [] });
    assert.equal(rejected.success, false, `${key} wurde ohne Flag akzeptiert.`);
    if (!rejected.success) {
      assert.deepEqual(rejected.error.issues[0]?.path, ["confirmDeleteAll"]);
      assert.match(rejected.error.issues[0]?.message ?? "", /confirmDeleteAll/);
    }

    const confirmed = schema.safeParse({ [key]: [], confirmDeleteAll: true });
    assert.equal(confirmed.success, true, `${key} wurde trotz Flag abgelehnt.`);
  }
});
