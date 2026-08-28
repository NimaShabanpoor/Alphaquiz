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

export const categoriesArraySchema = z.array(categorySchema).max(10_000);
const topicsArraySchema = z.array(topicSchema).max(10_000);
export const questionsArraySchema = z.array(questionSchema).max(10_000);
const quizzesArraySchema = z.array(quizSchema).max(10_000);
const exportsArraySchema = z.array(exportRecordSchema).max(10_000);
const examPublicationsArraySchema = z
  .array(examPublicationSchema)
  .max(10_000);
const confirmDeleteAllSchema = z.literal(true).optional();

function requireDeleteAllConfirmation(
  items: unknown[],
  confirmed: true | undefined,
  resourceName: string,
  context: z.RefinementCtx,
) {
  if (items.length > 0 || confirmed === true) return;
  context.addIssue({
    code: "custom",
    path: ["confirmDeleteAll"],
    message:
      `Zum Löschen aller ${resourceName} muss ` +
      "confirmDeleteAll: true gesetzt sein.",
  });
}

export const categoriesPayloadSchema = z
  .object({
    categories: categoriesArraySchema,
    confirmDeleteAll: confirmDeleteAllSchema,
  })
  .strict()
  .superRefine((payload, context) =>
    requireDeleteAllConfirmation(
      payload.categories,
      payload.confirmDeleteAll,
      "Kategorien",
      context,
    ),
  );
export const topicsPayloadSchema = z
  .object({
    topics: topicsArraySchema,
    confirmDeleteAll: confirmDeleteAllSchema,
  })
  .strict()
  .superRefine((payload, context) =>
    requireDeleteAllConfirmation(
      payload.topics,
      payload.confirmDeleteAll,
      "Unterkategorien",
      context,
    ),
  );
export const questionsPayloadSchema = z
  .object({
    questions: questionsArraySchema,
    confirmDeleteAll: confirmDeleteAllSchema,
  })
  .strict()
  .superRefine((payload, context) =>
    requireDeleteAllConfirmation(
      payload.questions,
      payload.confirmDeleteAll,
      "Fragen",
      context,
    ),
  );
export const quizzesPayloadSchema = z
  .object({
    quizzes: quizzesArraySchema,
    confirmDeleteAll: confirmDeleteAllSchema,
  })
  .strict()
  .superRefine((payload, context) =>
    requireDeleteAllConfirmation(
      payload.quizzes,
      payload.confirmDeleteAll,
      "Quizzes",
      context,
    ),
  );
export const exportsPayloadSchema = z
  .object({
    exports: exportsArraySchema,
    confirmDeleteAll: confirmDeleteAllSchema,
  })
  .strict()
  .superRefine((payload, context) =>
    requireDeleteAllConfirmation(
      payload.exports,
      payload.confirmDeleteAll,
      "Exporte",
      context,
    ),
  );
export const examPublicationsPayloadSchema = z
  .object({
    examPublications: examPublicationsArraySchema,
    confirmDeleteAll: confirmDeleteAllSchema,
  })
  .strict()
  .superRefine((payload, context) =>
    requireDeleteAllConfirmation(
      payload.examPublications,
      payload.confirmDeleteAll,
      "Prüfungsveröffentlichungen",
      context,
    ),
  );

export const resourceIdSchema = z.string().trim().min(1).max(200);

export function formatValidationError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Die übermittelten Daten sind ungültig.";
  const location = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${location}${issue.message}`;
}
