import { redactedError } from "@/lib/error-redaction";
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type OwnedExamPublication = {
  id: string;
  quizId: string;
};

export type OwnedExamAttempt = {
  id: string;
  publicationId: string;
  status: string;
  resultEmailStatus: string;
};

export async function loadOwnedExamPublication(
  client: SupabaseClient,
  userId: string,
  publicationId: string,
): Promise<OwnedExamPublication | null> {
  const { data: publication, error: publicationError } = await client
    .from("exam_publications")
    .select("id,quizId")
    .eq("id", publicationId)
    .maybeSingle();
  if (publicationError) throw redactedError(publicationError);
  if (!publication) return null;

  const quizId = String(publication.quizId);
  const { data: ownedQuiz, error: quizError } = await client
    .from("quizzes")
    .select("id")
    .eq("id", quizId)
    .eq("user_id", userId)
    .maybeSingle();
  if (quizError) throw redactedError(quizError);
  if (!ownedQuiz) return null;

  return { id: String(publication.id), quizId };
}

export async function loadOwnedExamAttempt(
  client: SupabaseClient,
  userId: string,
  attemptId: string,
): Promise<OwnedExamAttempt | null> {
  const { data: attempt, error: attemptError } = await client
    .from("exam_attempts")
    .select("id,publicationId,status,resultEmailStatus")
    .eq("id", attemptId)
    .maybeSingle();
  if (attemptError) throw redactedError(attemptError);
  if (!attempt) return null;

  const publicationId = String(attempt.publicationId);
  const publication = await loadOwnedExamPublication(
    client,
    userId,
    publicationId,
  );
  if (!publication) return null;

  return {
    id: String(attempt.id),
    publicationId,
    status: String(attempt.status),
    resultEmailStatus: String(attempt.resultEmailStatus),
  };
}
