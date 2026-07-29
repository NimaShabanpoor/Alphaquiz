import type {
  ExamTopicResult,
  Question,
  Quiz,
  Topic,
} from "@/lib/quiz-types";
import { QUIZ_UNASSIGNED_TOPIC_ID } from "@/lib/quiz-types";

export function calculateQuestionScore(
  question: Question,
  responses: Record<string, string[]>,
) {
  if (question.type === "text") {
    const given = (responses[question.id]?.[0] ?? "").trim().toLowerCase();
    const correct = question.answers.some(
      (answer) =>
        answer.correct && answer.text.trim().toLowerCase() === given,
    );
    return correct ? question.points : 0;
  }

  const chosen = new Set(responses[question.id] ?? []);
  const correct = question.answers.every(
    (answer) => chosen.has(answer.id) === answer.correct,
  );
  return correct ? question.points : 0;
}

export function calculateExamResult(
  quiz: Quiz,
  questions: Question[],
  topics: Topic[],
  responses: Record<string, string[]>,
) {
  const hiddenTopicIds = new Set(quiz.hiddenTopicIds);
  const getQuizTopicId = (question: Question) =>
    !question.topicId || hiddenTopicIds.has(question.topicId)
      ? QUIZ_UNASSIGNED_TOPIC_ID
      : question.topicId;
  const scoredQuestions = questions.map((question) => ({
    question,
    score: calculateQuestionScore(question, responses),
  }));
  const score = scoredQuestions.reduce((total, item) => total + item.score, 0);
  const possible = questions.reduce(
    (total, question) => total + question.points,
    0,
  );
  const percentage = possible ? Math.round((score / possible) * 100) : 0;

  const topicResults: ExamTopicResult[] = Array.from(
    new Set(questions.map(getQuizTopicId)),
  ).map((topicId) => {
    const topicQuestions = scoredQuestions.filter(
      (item) => getQuizTopicId(item.question) === topicId,
    );
    const topicScore = topicQuestions.reduce(
      (total, item) => total + item.score,
      0,
    );
    const topicPossible = topicQuestions.reduce(
      (total, item) => total + item.question.points,
      0,
    );
    const required =
      quiz.topicPassPercentages[topicId] ?? quiz.passPercentage;
    const topicPercentage = topicPossible
      ? Math.round((topicScore / topicPossible) * 100)
      : 0;
    return {
      topicId,
      name:
        topicId === QUIZ_UNASSIGNED_TOPIC_ID
          ? "Ohne Unterkategorie"
          : (topics.find((topic) => topic.id === topicId)?.name ??
            "Ohne Unterkategorie"),
      score: topicScore,
      possible: topicPossible,
      percentage: topicPercentage,
      required,
      passed: topicPercentage >= required,
    };
  });

  const passed =
    quiz.scoringMode === "per-topic"
      ? topicResults.length > 0 &&
        topicResults.every((topicResult) => topicResult.passed)
      : percentage >= quiz.passPercentage;

  return { score, possible, percentage, topicResults, passed };
}
