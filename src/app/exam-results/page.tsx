"use client";

import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Mail,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import type { ExamAttempt, ExamPublication } from "@/lib/quiz-types";
import styles from "./page.module.css";

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("de-CH") : "Keine Begrenzung";
}

function publicationStatus(publication: ExamPublication, now: number) {
  if (!publication.active) return "Deaktiviert";
  if (
    publication.availableFrom &&
    now < new Date(publication.availableFrom).getTime()
  ) {
    return "Geplant";
  }
  if (
    publication.availableUntil &&
    now > new Date(publication.availableUntil).getTime()
  ) {
    return "Abgelaufen";
  }
  return "Aktiv";
}

export default function ExamResultsPage() {
  const { state, updateExamAttempt, showToast } = useQuizApp();
  const [sendingAttemptId, setSendingAttemptId] = useState("");
  const [sendingPublicationId, setSendingPublicationId] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function sendResult(attempt: ExamAttempt, quiet = false) {
    if (attempt.status !== "submitted" && attempt.status !== "terminated") {
      return false;
    }
    const publication = state.examPublications.find(
      (item) => item.id === attempt.publicationId,
    );
    const quiz = state.quizzes.find(
      (item) => item.id === publication?.quizId,
    );
    if (!quiz) return false;

    if (!quiet) setSendingAttemptId(attempt.id);
    try {
      const response = await fetch("/api/exam-results/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          deliveryId: crypto.randomUUID(),
          name: attempt.name,
          email: attempt.email,
          quizTitle: quiz.title,
          status: attempt.status,
          score: attempt.score,
          possible: attempt.possible,
          percentage: attempt.percentage,
          passed: attempt.passed,
          topicResults: attempt.topicResults,
        }),
      });
      const data = (await response.json()) as {
        sent?: boolean;
        configured?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Versand fehlgeschlagen.");

      const resultEmailStatus = data.sent
        ? "sent"
        : data.configured === false
          ? "not-configured"
          : "failed";
      updateExamAttempt(attempt.id, { resultEmailStatus });
      if (!quiet) {
        showToast(
          data.sent
            ? `Ergebnis wurde an ${attempt.email} gesendet.`
            : "Resend ist noch nicht konfiguriert.",
        );
      }
      return Boolean(data.sent);
    } catch (error) {
      updateExamAttempt(attempt.id, { resultEmailStatus: "failed" });
      if (!quiet) {
        showToast(
          error instanceof Error
            ? error.message
            : "Die E-Mail konnte nicht gesendet werden.",
        );
      }
      return false;
    } finally {
      if (!quiet) setSendingAttemptId("");
    }
  }

  async function sendAll(publicationId: string, attempts: ExamAttempt[]) {
    setSendingPublicationId(publicationId);
    let sent = 0;
    for (const attempt of attempts) {
      if (await sendResult(attempt, true)) sent += 1;
    }
    setSendingPublicationId("");
    showToast(
      sent
        ? `${sent} von ${attempts.length} Ergebnis-E-Mails wurden gesendet.`
        : "Keine E-Mail gesendet. Prüfe die Resend-Konfiguration.",
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <Link className={ui.button} href="/exam-activity">
              Prüfungsaktivität
            </Link>
            <Link className={`${ui.button} ${ui.primary}`} href="/exams">
              Prüfungen verwalten
            </Link>
          </>
        }
        eyebrow="Resultate"
        lead="Prüfungszeiträume, Teilnahmezahlen und Ergebnisse zentral verwalten und per E-Mail versenden."
        title="Prüfungsergebnisse."
      />

      <section className={styles.examList}>
        {state.examPublications.length ? (
          state.examPublications.map((publication) => {
            const quiz = state.quizzes.find(
              (item) => item.id === publication.quizId,
            );
            const attempts = state.examAttempts.filter(
              (attempt) =>
                attempt.publicationId === publication.id &&
                attempt.status !== "reset",
            );
            const completed = attempts.filter(
              (attempt) =>
                attempt.status === "submitted" ||
                attempt.status === "terminated",
            );
            const passed = completed.filter((attempt) => attempt.passed).length;
            const failed = completed.length - passed;
            const average = completed.length
              ? Math.round(
                  completed.reduce(
                    (total, attempt) => total + attempt.percentage,
                    0,
                  ) / completed.length,
                )
              : 0;
            const status = publicationStatus(publication, currentTime);

            return (
              <article
                className={`${ui.card} ${styles.examCard}`}
                key={publication.id}
              >
                <header className={styles.examHead}>
                  <div>
                    <small>Online-Prüfung</small>
                    <h2>{quiz?.title ?? "Gelöschtes Quiz"}</h2>
                    <p>
                      Erstellt am{" "}
                      {new Date(publication.createdAt).toLocaleString("de-CH")}
                    </p>
                  </div>
                  <span className={ui.pill} data-tone={status === "Aktiv" ? "ready" : "draft"}>
                    {status}
                  </span>
                </header>

                <div className={styles.schedule}>
                  <span>
                    <CalendarClock aria-hidden="true" />
                    <small>Freigabe ab</small>
                    <strong>{formatDate(publication.availableFrom)}</strong>
                  </span>
                  <span>
                    <CalendarClock aria-hidden="true" />
                    <small>Freigabe bis</small>
                    <strong>{formatDate(publication.availableUntil)}</strong>
                  </span>
                  <span>
                    <Clock3 aria-hidden="true" />
                    <small>Zeit pro Versuch</small>
                    <strong>{publication.timeLimit} Minuten</strong>
                  </span>
                </div>

                <div className={styles.stats}>
                  <span>
                    <Users aria-hidden="true" />
                    <strong>{attempts.length}</strong>
                    <small>Versuche</small>
                  </span>
                  <span>
                    <CheckCircle2 aria-hidden="true" />
                    <strong>{passed}</strong>
                    <small>Bestanden</small>
                  </span>
                  <span>
                    <XCircle aria-hidden="true" />
                    <strong>{failed}</strong>
                    <small>Nicht bestanden</small>
                  </span>
                  <span>
                    <strong>{average} %</strong>
                    <small>Durchschnitt</small>
                  </span>
                </div>

                <div className={styles.resultsHead}>
                  <div>
                    <small>Teilnehmende</small>
                    <h3>Abgeschlossene Resultate</h3>
                  </div>
                  <button
                    className={`${ui.button} ${ui.primary}`}
                    disabled={
                      !completed.length ||
                      sendingPublicationId === publication.id
                    }
                    onClick={() =>
                      void sendAll(publication.id, completed)
                    }
                    type="button"
                  >
                    <Send aria-hidden="true" />
                    {sendingPublicationId === publication.id
                      ? "E-Mails werden gesendet …"
                      : `Alle E-Mails senden (${completed.length})`}
                  </button>
                </div>

                {completed.length ? (
                  <div className={styles.resultRows}>
                    {completed.map((attempt) => (
                      <article key={attempt.id}>
                        <span>
                          <strong>{attempt.name}</strong>
                          <small>{attempt.email}</small>
                        </span>
                        <span>
                          <strong>{attempt.percentage} %</strong>
                          <small>
                            {attempt.score}/{attempt.possible} Punkte ·{" "}
                            {attempt.passed
                              ? "Bestanden"
                              : "Nicht bestanden"}
                          </small>
                        </span>
                        <span className={styles.mailStatus}>
                          <Mail aria-hidden="true" />
                          {attempt.resultEmailStatus === "sent"
                            ? "Gesendet"
                            : attempt.resultEmailStatus === "failed"
                              ? "Fehlgeschlagen"
                              : attempt.resultEmailStatus === "not-configured"
                                ? "Nicht konfiguriert"
                                : "Ausstehend"}
                        </span>
                        <div className={styles.rowActions}>
                          <Link
                            className={ui.button}
                            href={`/exam-activity/${attempt.id}`}
                          >
                            <Eye aria-hidden="true" /> Öffnen
                          </Link>
                          <button
                            className={`${ui.button} ${ui.primary}`}
                            disabled={
                              sendingAttemptId === attempt.id ||
                              Boolean(sendingPublicationId)
                            }
                            onClick={() => void sendResult(attempt)}
                            type="button"
                          >
                            <Send aria-hidden="true" />
                            {sendingAttemptId === attempt.id
                              ? "Senden …"
                              : "E-Mail senden"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    text="Sobald eine Prüfung abgegeben oder beendet wurde, erscheint das Resultat hier."
                    title="Noch keine abgeschlossenen Resultate"
                  />
                )}
              </article>
            );
          })
        ) : (
          <div className={ui.card}>
            <EmptyState
              action={
                <Link className={`${ui.button} ${ui.primary}`} href="/exams">
                  Prüfung veröffentlichen
                </Link>
              }
              icon={Mail}
              text="Erstelle zuerst einen Prüfungslink."
              title="Keine Prüfungen vorhanden"
            />
          </div>
        )}
      </section>
    </>
  );
}
