import type {
  ExamInstance,
  ExamRandomizationConfig,
  Question,
  Quiz,
  Topic,
} from "@/lib/quiz-types";
import {
  QUIZ_ALL_QUESTIONS_TOPIC_ID,
  QUIZ_UNASSIGNED_TOPIC_ID,
} from "@/lib/quiz-types";

export type RandomizationValidationError = {
  field: string;
  message: string;
  topicId?: string;
};

export type GenerateExamInstanceInput = {
  attemptId: string;
  publicationId: string;
  studentKey: string;
  quiz: Quiz;
  questions: Question[];
  topics: Topic[];
  config: ExamRandomizationConfig;
  seed?: string;
  generatedAt?: string;
};

export function defaultExamRandomizationConfig(): ExamRandomizationConfig {
  return {
    questionOrderMode: "fixed",
    useTopics: true,
    questionCountByTopic: {},
    shuffleAnswers: false,
    requiredQuestionIds: [],
    lockedQuestionIds: [],
    retryMode: "regenerate",
  };
}

export function examTopicId(
  question: Question,
  quiz: Quiz,
  useTopics: boolean,
) {
  if (!useTopics) return QUIZ_ALL_QUESTIONS_TOPIC_ID;
  return !question.topicId || quiz.hiddenTopicIds.includes(question.topicId)
    ? QUIZ_UNASSIGNED_TOPIC_ID
    : question.topicId;
}

export function topicLabel(topicId: string, topics: Topic[]) {
  if (topicId === QUIZ_ALL_QUESTIONS_TOPIC_ID) return "Alle Fragen";
  if (topicId === QUIZ_UNASSIGNED_TOPIC_ID) return "Ohne Unterkategorie";
  return (
    topics.find((topic) => topic.id === topicId)?.name ??
    "Ohne Unterkategorie"
  );
}

function questionGroups(
  quiz: Quiz,
  questions: Question[],
  useTopics: boolean,
) {
  const groups = new Map<string, Question[]>();
  for (const question of questions) {
    const topicId = examTopicId(question, quiz, useTopics);
    const group = groups.get(topicId) ?? [];
    group.push(question);
    groups.set(topicId, group);
  }
  return groups;
}

export function validateExamRandomization(
  quiz: Quiz,
  questions: Question[],
  topics: Topic[],
  config: ExamRandomizationConfig,
): RandomizationValidationError[] {
  const errors: RandomizationValidationError[] = [];
  const questionIds = new Set(questions.map((question) => question.id));
  const groups = questionGroups(quiz, questions, config.useTopics);
  const required = new Set(
    config.requiredQuestionIds.filter((id) => questionIds.has(id)),
  );

  for (const [topicId, group] of groups) {
    const configured = config.questionCountByTopic[topicId];
    const count = configured === undefined ? group.length : configured;
    const requiredCount = group.filter((question) =>
      required.has(question.id),
    ).length;
    const label = topicLabel(topicId, topics);

    if (!Number.isInteger(count) || count < 0) {
      errors.push({
        field: `questionCountByTopic.${topicId}`,
        topicId,
        message: `Die Anzahl für „${label}“ muss eine ganze Zahl ab 0 sein.`,
      });
    } else if (count > group.length) {
      errors.push({
        field: `questionCountByTopic.${topicId}`,
        topicId,
        message: `Für „${label}“ sind nur ${group.length} Fragen verfügbar.`,
      });
    } else if (requiredCount > count) {
      errors.push({
        field: `questionCountByTopic.${topicId}`,
        topicId,
        message: `„${label}“ enthält ${requiredCount} verpflichtende Fragen, aber ausgewählt sind nur ${count}.`,
      });
    }
  }

  const unknownRequired = config.requiredQuestionIds.filter(
    (id) => !questionIds.has(id),
  );
  if (unknownRequired.length) {
    errors.push({
      field: "requiredQuestionIds",
      message:
        "Mindestens eine verpflichtende Frage gehört nicht mehr zu diesem Quiz.",
    });
  }

  const unknownLocked = config.lockedQuestionIds.filter(
    (id) => !questionIds.has(id),
  );
  if (unknownLocked.length) {
    errors.push({
      field: "lockedQuestionIds",
      message:
        "Mindestens eine geschützte Frage gehört nicht mehr zu diesem Quiz.",
    });
  }

  const totalSelected = Array.from(groups).reduce((total, [topicId, group]) => {
    const count = config.questionCountByTopic[topicId];
    return total + (count === undefined ? group.length : Math.max(0, count));
  }, 0);
  if (totalSelected === 0) {
    errors.push({
      field: "questionCountByTopic",
      message: "Die Prüfung muss mindestens eine Frage enthalten.",
    });
  }

  return errors;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function selectQuestions(
  quiz: Quiz,
  questions: Question[],
  config: ExamRandomizationConfig,
  random: () => number,
) {
  const groups = questionGroups(quiz, questions, config.useTopics);
  const required = new Set(config.requiredQuestionIds);
  const selected: Question[] = [];

  for (const [topicId, group] of groups) {
    const count = config.questionCountByTopic[topicId] ?? group.length;
    const requiredQuestions = group.filter((question) =>
      required.has(question.id),
    );
    const candidates = group.filter((question) => !required.has(question.id));
    selected.push(
      ...requiredQuestions,
      ...shuffle(candidates, random).slice(
        0,
        Math.max(0, count - requiredQuestions.length),
      ),
    );
  }

  const originalPosition = new Map(
    questions.map((question, index) => [question.id, index]),
  );
  return selected.sort(
    (left, right) =>
      (originalPosition.get(left.id) ?? 0) -
      (originalPosition.get(right.id) ?? 0),
  );
}

function orderSelectedQuestions(
  quiz: Quiz,
  selected: Question[],
  config: ExamRandomizationConfig,
  random: () => number,
) {
  const base = [...selected];
  let candidate: Question[];

  if (config.questionOrderMode === "fixed") {
    candidate = [...base];
  } else if (
    config.questionOrderMode === "shuffle-all" ||
    !config.useTopics
  ) {
    candidate = shuffle(base, random);
  } else {
    const groups = questionGroups(quiz, base, true);
    const entries =
      config.questionOrderMode === "shuffle-topics-and-questions"
        ? shuffle(Array.from(groups.entries()), random)
        : Array.from(groups.entries());
    candidate = entries.flatMap(([, questions]) =>
      shuffle(questions, random),
    );
  }

  const locked = new Set(config.lockedQuestionIds);
  const unlocked = candidate.filter((question) => !locked.has(question.id));
  const result: Question[] = new Array(base.length);
  let unlockedIndex = 0;

  base.forEach((question, index) => {
    if (locked.has(question.id)) result[index] = question;
  });
  for (let index = 0; index < result.length; index += 1) {
    if (!result[index]) {
      result[index] = unlocked[unlockedIndex];
      unlockedIndex += 1;
    }
  }
  return result;
}

export function generateExamInstance({
  attemptId,
  publicationId,
  studentKey,
  quiz,
  questions,
  topics,
  config,
  seed = `${publicationId}:${attemptId}`,
  generatedAt = new Date().toISOString(),
}: GenerateExamInstanceInput): ExamInstance {
  const errors = validateExamRandomization(
    quiz,
    questions,
    topics,
    config,
  );
  if (errors.length) {
    throw new Error(errors[0].message);
  }

  const random = createRandom(seed);
  const selected = selectQuestions(quiz, questions, config, random);
  const ordered = orderSelectedQuestions(quiz, selected, config, random);
  const generatedQuestions = ordered.map((question) => ({
    ...question,
    image: question.image ? { ...question.image } : undefined,
    answers:
      config.shuffleAnswers &&
      question.shuffle &&
      question.type !== "text"
        ? shuffle(
            question.answers.map((answer) => ({ ...answer })),
            random,
          )
        : question.answers.map((answer) => ({ ...answer })),
  }));
  const topicOrder = Array.from(
    new Set(
      generatedQuestions.map((question) =>
        examTopicId(question, quiz, config.useTopics),
      ),
    ),
  );

  return {
    id: `instance-${attemptId}`,
    publicationId,
    quizId: quiz.id,
    attemptId,
    studentKey,
    quizSnapshot: {
      ...quiz,
      questionIds: [...quiz.questionIds],
      topicPassPercentages: { ...quiz.topicPassPercentages },
      hiddenTopicIds: [...quiz.hiddenTopicIds],
    },
    questions: generatedQuestions,
    questionOrder: generatedQuestions.map((question) => question.id),
    topicOrder,
    topicLabelById: Object.fromEntries(
      topicOrder.map((topicId) => [topicId, topicLabel(topicId, topics)]),
    ),
    answerOrderByQuestionId: Object.fromEntries(
      generatedQuestions.map((question) => [
        question.id,
        question.answers.map((answer) => answer.id),
      ]),
    ),
    seed,
    generatedAt,
    sourceQuizUpdatedAt: quiz.updatedAt,
    configSnapshot: {
      ...config,
      questionCountByTopic: { ...config.questionCountByTopic },
      requiredQuestionIds: [...config.requiredQuestionIds],
      lockedQuestionIds: [...config.lockedQuestionIds],
    },
  };
}

export function reuseExamInstance(
  previous: ExamInstance,
  attemptId: string,
  studentKey: string,
  generatedAt = new Date().toISOString(),
): ExamInstance {
  return {
    ...previous,
    id: `instance-${attemptId}`,
    attemptId,
    studentKey,
    generatedAt,
    previousAttemptId: previous.attemptId,
    questions: previous.questions.map((question) => ({
      ...question,
      image: question.image ? { ...question.image } : undefined,
      answers: question.answers.map((answer) => ({ ...answer })),
    })),
    questionOrder: [...previous.questionOrder],
    topicOrder: [...previous.topicOrder],
    topicLabelById: { ...previous.topicLabelById },
    quizSnapshot: {
      ...previous.quizSnapshot,
      questionIds: [...previous.quizSnapshot.questionIds],
      topicPassPercentages: {
        ...previous.quizSnapshot.topicPassPercentages,
      },
      hiddenTopicIds: [...previous.quizSnapshot.hiddenTopicIds],
    },
    answerOrderByQuestionId: Object.fromEntries(
      Object.entries(previous.answerOrderByQuestionId).map(
        ([questionId, answerIds]) => [questionId, [...answerIds]],
      ),
    ),
    configSnapshot: {
      ...previous.configSnapshot,
      questionCountByTopic: {
        ...previous.configSnapshot.questionCountByTopic,
      },
      requiredQuestionIds: [
        ...previous.configSnapshot.requiredQuestionIds,
      ],
      lockedQuestionIds: [...previous.configSnapshot.lockedQuestionIds],
    },
  };
}
