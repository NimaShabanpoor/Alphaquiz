import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateExamInstanceResult } from "@/lib/exam-scoring";
import type { ExamInstance, ExamEventType } from "@/lib/quiz-types";
import { sendAttemptResultEmail } from "@/lib/result-email";

export type StoredExamAttempt = Record<string, unknown>;

export async function loadStoredAttempt(
  client: SupabaseClient,
  attemptId: string,
) {
  const [attemptResult, instanceResult] = await Promise.all([
    client.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle(),
    client
      .from("exam_instances")
      .select("snapshot")
      .eq("attemptId", attemptId)
      .maybeSingle(),
  ]);
  if (attemptResult.error) throw new Error(attemptResult.error.message);
  if (instanceResult.error) throw new Error(instanceResult.error.message);
  if (!attemptResult.data || !instanceResult.data?.snapshot) return null;
  return {
    attempt: attemptResult.data as StoredExamAttempt,
    instance: instanceResult.data.snapshot as ExamInstance,
  };
}

export async function finalizeStoredAttempt(
  client: SupabaseClient,
  attempt: StoredExamAttempt,
  instance: ExamInstance,
  status: "submitted" | "terminated",
) {
  if (attempt.status !== "in-progress") {
    const stored = await loadStoredAttempt(client, String(attempt.id));
    return stored?.attempt ?? attempt;
  }

  const result = calculateExamInstanceResult(
    instance,
    (attempt.responses as Record<string, string[]> | null) ?? {},
  );
  const submittedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await client
    .from("exam_attempts")
    .update({
      ...result,
      status,
      submittedAt,
      updatedAt: submittedAt,
    })
    .eq("id", String(attempt.id))
    .eq("status", "in-progress")
    .select("*")
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);

  if (!updated) {
    const stored = await loadStoredAttempt(client, String(attempt.id));
    return stored?.attempt ?? attempt;
  }

  const { error: eventError } = await client.from("exam_events").insert({
    id: `event-${crypto.randomUUID()}`,
    publicationId: String(attempt.publicationId),
    attemptId: String(attempt.id),
    type: status,
    message:
      status === "terminated"
        ? "Prüfung wegen Regelverstoss beendet"
        : "Prüfung abgegeben",
    createdAt: submittedAt,
  });
  if (eventError) throw new Error(eventError.message);

  const { data: publication } = await client
    .from("exam_publications")
    .select("sendResults")
    .eq("id", String(attempt.publicationId))
    .maybeSingle();
  if (publication?.sendResults) {
    try {
      await sendAttemptResultEmail(client, String(attempt.id));
    } catch {
      // Das Resultat bleibt gespeichert, auch wenn der Maildienst ausfällt.
    }
  }

  const stored = await loadStoredAttempt(client, String(attempt.id));
  return stored?.attempt ?? updated;
}

export async function expireAttemptIfNeeded(
  client: SupabaseClient,
  attempt: StoredExamAttempt,
  instance: ExamInstance,
  timeLimit: number,
) {
  if (attempt.status !== "in-progress" || timeLimit <= 0) return attempt;
  const deadline =
    new Date(String(attempt.startedAt)).getTime() + timeLimit * 60_000;
  if (Date.now() < deadline) return attempt;
  return finalizeStoredAttempt(client, attempt, instance, "submitted");
}

export function validateExamResponse(
  instance: ExamInstance,
  questionId: string,
  values: unknown,
) {
  const question = instance.questions.find((item) => item.id === questionId);
  if (!question) return { error: "Diese Frage gehört nicht zum Versuch." };
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    return { error: "Die Antwort ist ungültig." };
  }

  const normalized = [...new Set(values as string[])];
  if (question.type === "text") {
    const text = normalized[0] ?? "";
    if (normalized.length > 1 || text.length > 10_000) {
      return { error: "Die Textantwort ist zu lang." };
    }
    return { values: [text] };
  }

  const allowedAnswerIds = new Set(
    question.answers.map((answer) => answer.id),
  );
  if (normalized.some((answerId) => !allowedAnswerIds.has(answerId))) {
    return { error: "Mindestens eine Antwort gehört nicht zu dieser Frage." };
  }
  if (
    !["multiple", "order", "match"].includes(question.type) &&
    normalized.length > 1
  ) {
    return { error: "Für diese Frage ist nur eine Antwort erlaubt." };
  }
  return { values: normalized };
}

export async function recordViolation(
  client: SupabaseClient,
  attemptId: string,
  publicationId: string,
  type: Extract<ExamEventType, "tab-hidden" | "fullscreen-exit">,
  maxViolations: number,
) {
  const message =
    type === "tab-hidden" ? "Prüfungs-Tab verlassen" : "Vollbild verlassen";

  for (let retry = 0; retry < 4; retry += 1) {
    const { data: current, error: readError } = await client
      .from("exam_attempts")
      .select("violationCount,status")
      .eq("id", attemptId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current || current.status !== "in-progress") return current;

    const previousCount = Number(current.violationCount) || 0;
    const nextCount = previousCount + 1;
    const { data: updated, error: updateError } = await client
      .from("exam_attempts")
      .update({
        violationCount: nextCount,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", attemptId)
      .eq("status", "in-progress")
      .eq("violationCount", previousCount)
      .select("*")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) continue;

    const { error: eventError } = await client.from("exam_events").insert({
      id: `event-${crypto.randomUUID()}`,
      publicationId,
      attemptId,
      type,
      message,
      createdAt: new Date().toISOString(),
    });
    if (eventError) throw new Error(eventError.message);
    return { ...updated, shouldTerminate: nextCount >= maxViolations };
  }

  throw new Error("Der Verstoss konnte nicht sicher gespeichert werden.");
}
