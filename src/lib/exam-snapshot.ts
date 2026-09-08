import { z } from "zod";
import type { ExamInstance } from "@/lib/quiz-types";

// Deliberately separate from input validation: historical exam content must not
// be reinterpreted using today's editor limits. Objects strip unknown fields at
// every structural level; free question text is not an identity registry.
const strings = z.array(z.string());
const numbers = z.record(z.string(), z.number());
const snapshotSchema = z.object({
  id: z.string(), publicationId: z.string(), quizId: z.string(), attemptId: z.string(),
  quizSnapshot: z.object({
    id: z.string(), title: z.string(), description: z.string(), categoryId: z.string(),
    status: z.enum(["draft", "ready", "exported"]), questionIds: strings,
    passPercentage: z.number(), scoringMode: z.enum(["combined", "per-topic"]),
    topicPassPercentages: numbers, hiddenTopicIds: strings, updatedAt: z.string(),
  }),
  questions: z.array(z.object({
    id: z.string(), title: z.string(), description: z.string(),
    type: z.enum(["single", "multiple", "boolean", "text", "order", "match", "scale"]),
    categoryId: z.string(), topicId: z.string(), points: z.number(), shuffle: z.boolean(),
    image: z.object({ dataUrl: z.string(), fileName: z.string(), alt: z.string() }).optional(),
    answers: z.array(z.object({ id: z.string(), text: z.string(), correct: z.boolean() })),
  })),
  questionOrder: strings, topicOrder: strings,
  topicLabelById: z.record(z.string(), z.string()),
  answerOrderByQuestionId: z.record(z.string(), strings),
  seed: z.string(), generatedAt: z.string(), previousAttemptId: z.string().optional(),
  sourceQuizUpdatedAt: z.string(),
  configSnapshot: z.object({
    questionOrderMode: z.enum(["fixed", "shuffle-all", "shuffle-within-topics", "shuffle-topics-and-questions"]),
    useTopics: z.boolean(), questionCountByTopic: numbers, shuffleAnswers: z.boolean(),
    requiredQuestionIds: strings, lockedQuestionIds: strings,
    retryMode: z.enum(["reuse", "regenerate"]),
  }),
});

export function readExamSnapshot(value: unknown): ExamInstance {
  const result = snapshotSchema.safeParse(value);
  if (!result.success) throw new Error("Der gespeicherte Prüfungsstand ist ungültig.");
  return result.data;
}
