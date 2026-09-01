import { examTopicId } from "@/lib/exam-randomization";
import type { ExamInstance, PublicExamQuestion } from "@/lib/quiz-types";

export function toPublicExamQuestions(
  instance: ExamInstance,
): PublicExamQuestion[] {
  return instance.questions.map((question) => {
    const topicId = examTopicId(
      question,
      instance.quizSnapshot,
      instance.configSnapshot.useTopics,
    );
    return {
      id: question.id,
      title: question.title,
      description: question.description,
      image: question.image,
      type: question.type,
      points: question.points,
      topicLabel:
        instance.topicLabelById[topicId] ?? "Ohne Unterkategorie",
      answers: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
      })),
    };
  });
}
