import { redactedError } from "@/lib/error-redaction";
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadExamSourceByPublicationId } from "@/lib/exam-data";
import type { ExamTopicResult } from "@/lib/quiz-types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendAttemptResultEmail(
  client: SupabaseClient,
  attemptId: string,
  deliveryId = "automatic",
) {
  const { data: attempt, error: attemptError } = await client
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (attemptError) throw redactedError(attemptError);
  if (!attempt) throw new Error("Das Prüfungsresultat wurde nicht gefunden.");
  if (attempt.status !== "submitted" && attempt.status !== "terminated") {
    throw new Error("Die Prüfung ist noch nicht abgeschlossen.");
  }

  const source = await loadExamSourceByPublicationId(
    client,
    String(attempt.publicationId),
  );
  if (!source) throw new Error("Die zugehörige Prüfung wurde nicht gefunden.");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    await client
      .from("exam_attempts")
      .update({ resultEmailStatus: "not-configured" })
      .eq("id", attemptId);
    return { sent: false, configured: false };
  }

  const topicResults =
    (attempt.topicResults as ExamTopicResult[] | null) ?? [];
  const topicRows = topicResults
    .map(
      (topic) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e9e5de">${escapeHtml(topic.name)}</td>
          <td style="padding:10px;border-bottom:1px solid #e9e5de">${topic.score}/${topic.possible}</td>
          <td style="padding:10px;border-bottom:1px solid #e9e5de">${topic.percentage} %</td>
          <td style="padding:10px;border-bottom:1px solid #e9e5de">${topic.passed ? "Bestanden" : "Nicht bestanden"}</td>
        </tr>`,
    )
    .join("");
  const interrupted =
    attempt.status === "terminated"
      ? '<p style="color:#b4423c"><strong>Hinweis:</strong> Die Prüfung wurde wegen eines Regelverstosses beendet.</p>'
      : "";
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1c2333;max-width:640px;margin:auto">
      <h1 style="font-family:Georgia,serif">Dein AlphaQuiz-Ergebnis</h1>
      <p>Hallo ${escapeHtml(String(attempt.name))},</p>
      <p>du hast die Prüfung <strong>${escapeHtml(source.quiz.title)}</strong> abgeschlossen.</p>
      ${interrupted}
      <div style="background:#fcf3e3;border-radius:8px;padding:18px;margin:20px 0">
        <strong style="font-size:24px">${Number(attempt.score)} von ${Number(attempt.possible)} Punkten</strong>
        <p style="margin:6px 0 0">${Number(attempt.percentage)} % · ${attempt.passed ? "Bestanden" : "Nicht bestanden"}</p>
      </div>
      ${
        topicRows
          ? `<table style="border-collapse:collapse;width:100%">
              <thead><tr><th align="left">Thema</th><th align="left">Punkte</th><th align="left">Prozent</th><th align="left">Status</th></tr></thead>
              <tbody>${topicRows}</tbody>
            </table>`
          : ""
      }
      <p style="color:#8a867f;font-size:12px;margin-top:24px">Diese Nachricht wurde automatisch von AlphaQuiz versendet.</p>
    </div>`;

  const safeDeliveryId =
    deliveryId.replace(/[^a-z0-9-]/gi, "").slice(0, 64) || "automatic";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `alphaquiz-result/${attemptId}/${safeDeliveryId}`,
    },
    body: JSON.stringify({
      from,
      to: [String(attempt.email)],
      subject: `Ergebnis: ${source.quiz.title}`,
      html,
    }),
  });
  const data = (await response.json()) as { id?: string; message?: string };
  const resultEmailStatus = response.ok ? "sent" : "failed";
  await client
    .from("exam_attempts")
    .update({ resultEmailStatus })
    .eq("id", attemptId);

  if (!response.ok) {
    throw redactedError(data);
  }
  return { sent: true, configured: true, id: data.id };
}
