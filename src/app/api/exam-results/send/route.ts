import type { ExamTopicResult } from "@/lib/quiz-types";

export const runtime = "nodejs";

type ResultPayload = {
  attemptId: string;
  name: string;
  email: string;
  quizTitle: string;
  status: "submitted" | "terminated";
  score: number;
  possible: number;
  percentage: number;
  passed: boolean;
  topicResults: ExamTopicResult[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "AlphaQuiz <ergebnisse@example.com>";
  if (!apiKey || !process.env.RESEND_FROM_EMAIL) {
    return Response.json({ sent: false, configured: false });
  }

  try {
    const payload = (await request.json()) as ResultPayload;
    if (
      !payload.attemptId ||
      !payload.name?.trim() ||
      !EMAIL_PATTERN.test(payload.email ?? "") ||
      !payload.quizTitle?.trim() ||
      !Number.isFinite(payload.score) ||
      !Number.isFinite(payload.possible) ||
      !Number.isFinite(payload.percentage)
    ) {
      return Response.json(
        { error: "Ungültige Ergebnisdaten." },
        { status: 400 },
      );
    }

    const topicRows = (payload.topicResults ?? [])
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
      payload.status === "terminated"
        ? "<p style=\"color:#b4423c\"><strong>Hinweis:</strong> Die Prüfung wurde wegen eines Regelverstoßes beendet.</p>"
        : "";
    const html = `
      <div style="font-family:Arial,sans-serif;color:#1c2333;max-width:640px;margin:auto">
        <h1 style="font-family:Georgia,serif">Dein AlphaQuiz-Ergebnis</h1>
        <p>Hallo ${escapeHtml(payload.name)},</p>
        <p>du hast die Prüfung <strong>${escapeHtml(payload.quizTitle)}</strong> abgeschlossen.</p>
        ${interrupted}
        <div style="background:#fcf3e3;border-radius:8px;padding:18px;margin:20px 0">
          <strong style="font-size:24px">${payload.score} von ${payload.possible} Punkten</strong>
          <p style="margin:6px 0 0">${payload.percentage} % · ${payload.passed ? "Bestanden" : "Nicht bestanden"}</p>
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

    const body: Record<string, unknown> = {
      from,
      to: [payload.email],
      subject: `Ergebnis: ${payload.quizTitle}`,
      html,
    };
    if (process.env.ADMIN_RESULT_EMAIL) {
      body.bcc = [process.env.ADMIN_RESULT_EMAIL];
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `alphaquiz-result/${payload.attemptId}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as {
      id?: string;
      message?: string;
    };
    if (!response.ok) {
      return Response.json(
        { error: data.message ?? "E-Mail-Versand fehlgeschlagen." },
        { status: 502 },
      );
    }
    return Response.json({ sent: true, configured: true, id: data.id });
  } catch {
    return Response.json(
      { error: "Die Ergebnis-E-Mail konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
