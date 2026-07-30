import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultExamRandomizationConfig,
  generateExamInstance,
  reuseExamInstance,
} from "@/lib/exam-randomization";
import type {
  ExamInstance,
  ExamRandomizationConfig,
  Question,
  Quiz,
  Topic,
} from "@/lib/quiz-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type StartRequest = {
  attemptId: string;
  publicationId: string;
  name: string;
  email: string;
  quiz: Quiz;
  questions: Question[];
  topics: Topic[];
  config?: ExamRandomizationConfig;
  previousInstance?: ExamInstance;
};

async function loadSourceFromSupabase(
  client: SupabaseClient,
  publicationId: string,
) {
  const { data: publication, error: publicationError } = await client
    .from("exam_publications")
    .select("*")
    .eq("id", publicationId)
    .maybeSingle();
  if (publicationError || !publication) return null;

  const { data: quiz, error: quizError } = await client
    .from("quizzes")
    .select("*")
    .eq("id", publication.quizId)
    .maybeSingle();
  if (quizError || !quiz) return null;

  const { data: links, error: linkError } = await client
    .from("quiz_questions")
    .select("questionId,position")
    .eq("quizId", quiz.id)
    .order("position");
  if (linkError || !links?.length) return null;

  const questionIds = links.map((link) => link.questionId as string);
  const [{ data: questionRows, error: questionError }, { data: topicRows }] =
    await Promise.all([
      client.from("questions").select("*").in("id", questionIds),
      client.from("topics").select("*"),
    ]);
  if (questionError || !questionRows?.length) return null;

  const { data: answerRows, error: answerError } = await client
    .from("answers")
    .select("*")
    .in("questionId", questionIds)
    .order("position");
  if (answerError) return null;

  const questionById = new Map(
    questionRows.map((question) => [
      question.id as string,
      {
        ...question,
        answers: (answerRows ?? [])
          .filter((answer) => answer.questionId === question.id)
          .map((answer) => ({
            id: String(answer.id),
            text: String(answer.text),
            correct: Boolean(answer.correct),
          })),
      } as Question,
    ]),
  );

  return {
    quiz: {
      ...quiz,
      questionIds,
      hiddenTopicIds: Array.isArray(quiz.hiddenTopicIds)
        ? quiz.hiddenTopicIds
        : [],
      topicPassPercentages: quiz.topicPassPercentages ?? {},
    } as Quiz,
    questions: questionIds
      .map((id) => questionById.get(id))
      .filter((question): question is Question => Boolean(question)),
    topics: (topicRows ?? []) as Topic[],
    config:
      (publication.randomization as ExamRandomizationConfig | undefined) ??
      defaultExamRandomizationConfig(),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartRequest;
    if (
      !body.attemptId ||
      !body.publicationId ||
      !body.name?.trim() ||
      !body.email?.trim()
    ) {
      return Response.json(
        { error: "Versuchs-ID, Prüfung, Name und E-Mail-Adresse sind nötig." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    let canPersistInstance = false;
    if (supabase.client) {
      const { data: existingInstance, error: instanceLookupError } =
        await supabase.client
          .from("exam_instances")
          .select("snapshot")
          .eq("attemptId", body.attemptId)
          .maybeSingle();
      if (existingInstance?.snapshot) {
        return Response.json({
          instance: existingInstance.snapshot as ExamInstance,
        });
      }
      canPersistInstance = !instanceLookupError;
    }
    const databaseSource = supabase.client
      ? await loadSourceFromSupabase(supabase.client, body.publicationId)
      : null;
    const source = databaseSource ?? {
      quiz: body.quiz,
      questions: body.questions,
      topics: body.topics,
      config: body.config ?? defaultExamRandomizationConfig(),
    };

    const instance =
      source.config.retryMode === "reuse" && body.previousInstance
        ? reuseExamInstance(
            body.previousInstance,
            body.attemptId,
            body.email.trim().toLowerCase(),
          )
        : generateExamInstance({
            attemptId: body.attemptId,
            publicationId: body.publicationId,
            studentKey: body.email.trim().toLowerCase(),
            quiz: source.quiz,
            questions: source.questions,
            topics: source.topics,
            config: source.config,
          });

    if (supabase.client && databaseSource && canPersistInstance) {
      const startedAt = new Date().toISOString();
      const { error: attemptError } = await supabase.client
        .from("exam_attempts")
        .upsert(
          {
            id: body.attemptId,
            publicationId: body.publicationId,
            name: body.name.trim(),
            email: body.email.trim().toLowerCase(),
            status: "in-progress",
            startedAt,
            currentQuestion: 0,
            responses: {},
            score: 0,
            possible: 0,
            percentage: 0,
            passed: false,
            topicResults: [],
            violationCount: 0,
            resultEmailStatus: "pending",
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (attemptError) {
        return Response.json({ error: attemptError.message }, { status: 409 });
      }
      const { error: instanceError } = await supabase.client
        .from("exam_instances")
        .upsert(
          {
            id: instance.id,
            attemptId: instance.attemptId,
            publicationId: instance.publicationId,
            quizId: instance.quizId,
            studentKey: instance.studentKey,
            questionOrder: instance.questionOrder,
            topicOrder: instance.topicOrder,
            answerOrderByQuestionId: instance.answerOrderByQuestionId,
            snapshot: instance,
            seed: instance.seed,
            generatedAt: instance.generatedAt,
            previousAttemptId: instance.previousAttemptId ?? null,
          },
          { onConflict: "attemptId", ignoreDuplicates: true },
        );
      if (instanceError) {
        return Response.json({ error: instanceError.message }, { status: 409 });
      }
      const { data: storedInstance } = await supabase.client
        .from("exam_instances")
        .select("snapshot")
        .eq("attemptId", instance.attemptId)
        .maybeSingle();
      if (storedInstance?.snapshot) {
        return Response.json({
          instance: storedInstance.snapshot as ExamInstance,
        });
      }
    }

    return Response.json({ instance });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Die Prüfungsinstanz konnte nicht erzeugt werden.",
      },
      { status: 400 },
    );
  }
}
