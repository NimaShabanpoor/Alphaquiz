import { defaultExamRandomizationConfig } from "@/lib/exam-randomization";
import { seedState } from "@/lib/seed-data";
import type { QuizState } from "@/lib/quiz-types";

export function normalizeQuizState(stored: Partial<QuizState>): QuizState {
  const categories = Array.isArray(stored.categories)
    ? stored.categories
    : seedState.categories;
  const sourceTopics = Array.isArray(stored.topics)
    ? stored.topics
    : seedState.topics.filter((topic) =>
        categories.some((category) => category.id === topic.categoryId),
      );
  const topics = [...sourceTopics];

  for (const category of categories) {
    if (!topics.some((topic) => topic.categoryId === category.id)) {
      topics.push({
        id: `topic-${category.id}-allgemein`,
        categoryId: category.id,
        name: "Allgemein",
      });
    }
  }

  const questions = (stored.questions ?? seedState.questions).map(
    (question) => ({
      ...question,
      image:
        question.image?.dataUrl && question.image?.fileName
          ? {
              dataUrl: question.image.dataUrl,
              fileName: question.image.fileName,
              alt: question.image.alt ?? "",
            }
          : undefined,
      topicId:
        question.topicId &&
        topics.some(
          (topic) =>
            topic.id === question.topicId &&
            topic.categoryId === question.categoryId,
        )
          ? question.topicId
          : (() => {
              const seedTopicId = seedState.questions.find(
                (seedQuestion) => seedQuestion.id === question.id,
              )?.topicId;
              return (
                topics.find((topic) => topic.id === seedTopicId)?.id ??
                topics.find(
                  (topic) => topic.categoryId === question.categoryId,
                )?.id ??
                ""
              );
            })(),
    }),
  );
  const quizzes = (stored.quizzes ?? seedState.quizzes).map((quiz) => ({
    ...quiz,
    passPercentage: quiz.passPercentage ?? 70,
    scoringMode: quiz.scoringMode ?? "combined",
    topicPassPercentages: quiz.topicPassPercentages ?? {},
    hiddenTopicIds: Array.isArray(quiz.hiddenTopicIds)
      ? quiz.hiddenTopicIds
      : [],
  }));

  return {
    categories,
    topics,
    questions,
    quizzes,
    exports: stored.exports ?? [],
    examPublications: (stored.examPublications ?? []).map((publication) => ({
      ...publication,
      randomization: {
        ...defaultExamRandomizationConfig(),
        ...(publication.randomization ?? {}),
        questionCountByTopic: {
          ...(publication.randomization?.questionCountByTopic ?? {}),
        },
        requiredQuestionIds: [
          ...(publication.randomization?.requiredQuestionIds ?? []),
        ],
        lockedQuestionIds: [
          ...(publication.randomization?.lockedQuestionIds ?? []),
        ],
      },
      availableFrom: publication.availableFrom ?? "",
      availableUntil: publication.availableUntil ?? "",
    })),
    examAttempts: stored.examAttempts ?? [],
    examEvents: stored.examEvents ?? [],
  };
}
