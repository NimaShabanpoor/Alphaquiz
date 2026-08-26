import { z } from "zod";

const idSchema = z.string().trim().min(1).max(200);
const isoDateSchema = z.string().datetime({ offset: true });

export const categorySchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(120),
    color: z.string().trim().min(1).max(32),
  })
  .strict();

export const topicSchema = z
  .object({
    id: idSchema,
    categoryId: idSchema,
    name: z.string().trim().min(1).max(120),
  })
  .strict();

const answerSchema = z
  .object({
    id: idSchema,
    text: z.string().max(5_000),
    correct: z.boolean(),
  })
  .strict();

const questionImageSchema = z
  .object({
    dataUrl: z.string().max(3_000_000),
    fileName: z.string().trim().min(1).max(255),
    alt: z.string().max(500),
  })
  .strict();

export const questionSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(1_000),
    description: z.string().max(20_000),
    image: questionImageSchema.optional(),
    type: z.enum([
      "single",
      "multiple",
      "boolean",
      "text",
      "order",
      "match",
      "scale",
    ]),
    categoryId: z.string().max(200),
    topicId: z.string().max(200),
    points: z.number().int().min(1).max(10_000),
    shuffle: z.boolean(),
    answers: z.array(answerSchema).max(500),
  })
  .strict();

export const quizSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(1_000),
    description: z.string().max(20_000),
    categoryId: z.string().max(200),
    status: z.enum(["draft", "ready", "exported"]),
    questionIds: z.array(idSchema).max(10_000),
    passPercentage: z.number().int().min(0).max(100),
    scoringMode: z.enum(["combined", "per-topic"]),
    topicPassPercentages: z.record(idSchema, z.number().int().min(0).max(100)),
    hiddenTopicIds: z.array(idSchema).max(10_000),
    updatedAt: isoDateSchema,
  })
  .strict()
  .refine((quiz) => new Set(quiz.questionIds).size === quiz.questionIds.length, {
    message: "Eine Frage darf einem Quiz nur einmal zugeordnet sein.",
    path: ["questionIds"],
  });

export const exportRecordSchema = z
  .object({
    id: idSchema,
    quizId: idSchema,
    format: z.string().trim().min(1).max(50),
    fileName: z.string().trim().min(1).max(255),
    createdAt: isoDateSchema,
  })
  .strict();

const randomizationSchema = z
  .object({
    questionOrderMode: z.enum([
      "fixed",
      "shuffle-all",
      "shuffle-within-topics",
      "shuffle-topics-and-questions",
    ]),
    useTopics: z.boolean(),
    questionCountByTopic: z.record(idSchema, z.number().int().min(0).max(10_000)),
    shuffleAnswers: z.boolean(),
    requiredQuestionIds: z.array(idSchema).max(10_000),
    lockedQuestionIds: z.array(idSchema).max(10_000),
    retryMode: z.enum(["reuse", "regenerate"]),
  })
  .strict();

export const examPublicationSchema = z
  .object({
    id: idSchema,
    quizId: idSchema,
    slug: z.string().trim().min(1).max(255),
    mode: z.enum(["closed", "open-book"]),
    timeLimit: z.number().int().min(1).max(10_080),
    maxViolations: z.number().int().min(1).max(100),
    active: z.boolean(),
    sendResults: z.boolean(),
    randomization: randomizationSchema,
    availableFrom: z.union([isoDateSchema, z.literal("")]).optional(),
    availableUntil: z.union([isoDateSchema, z.literal("")]).optional(),
    createdAt: isoDateSchema,
  })
  .strict();

export const categoriesPayloadSchema = z
  .object({ categories: z.array(categorySchema).max(10_000) })
  .strict();
export const topicsPayloadSchema = z
  .object({ topics: z.array(topicSchema).max(10_000) })
  .strict();
export const questionsPayloadSchema = z
  .object({ questions: z.array(questionSchema).max(10_000) })
  .strict();
export const quizzesPayloadSchema = z
  .object({ quizzes: z.array(quizSchema).max(10_000) })
  .strict();
export const exportsPayloadSchema = z
  .object({ exports: z.array(exportRecordSchema).max(10_000) })
  .strict();
export const examPublicationsPayloadSchema = z
  .object({ examPublications: z.array(examPublicationSchema).max(10_000) })
  .strict();

export const resourceIdSchema = z.string().trim().min(1).max(200);

export function formatValidationError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Die übermittelten Daten sind ungültig.";
  const location = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${location}${issue.message}`;
}
