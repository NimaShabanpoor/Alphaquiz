"use client";

import {
  BookOpen,
  Clock3,
  Copy,
  ExternalLink,
  Mail,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import type { ExamMode } from "@/lib/quiz-types";
import styles from "./page.module.css";

export default function ExamsPage() {
  const {
    state,
    createExamPublication,
    updateExamPublication,
    showToast,
  } = useQuizApp();
  const [quizId, setQuizId] = useState(state.quizzes[0]?.id ?? "");

  function createPublication() {
    if (!quizId) return;
    createExamPublication(quizId);
    showToast("Prüfungslink wurde erstellt.");
  }

  async function copyLink(slug: string) {
    const link = `${window.location.origin}/exam/${slug}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Prüfungslink wurde kopiert.");
    } catch {
      showToast("Link konnte nicht automatisch kopiert werden.");
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <Link className={ui.button} href="/exam-activity">
            <Users aria-hidden="true" /> Prüfungsaktivität
          </Link>
        }
        eyebrow="Prüfungen"
        lead="Veröffentliche ein Quiz als eigenen Link. Microsoft Forms bleibt weiterhin als Export verfügbar."
        title="Prüfung veröffentlichen."
      />

      <section className={`${ui.card} ${styles.create}`}>
        <div>
          <span>Neue Veröffentlichung</span>
          <h2>Sicheren Prüfungslink erstellen</h2>
          <p>
            Teilnehmende melden sich ausschliesslich mit Name und E-Mail-Adresse
            an.
          </p>
        </div>
        <label className={ui.field}>
          <span>Quiz auswählen</span>
          <select
            className={ui.input}
            onChange={(event) => setQuizId(event.target.value)}
            value={quizId}
          >
            {state.quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title} · {quiz.questionIds.length} Fragen
              </option>
            ))}
          </select>
        </label>
        <button
          className={`${ui.button} ${ui.primary}`}
          disabled={!quizId}
          onClick={createPublication}
          type="button"
        >
          <Plus aria-hidden="true" /> Prüfung veröffentlichen
        </button>
      </section>

      <section className={styles.publications}>
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
            const link = `/exam/${publication.slug}`;
            return (
              <article
                className={`${ui.card} ${styles.publication}`}
                key={publication.id}
              >
                <header>
                  <span className={styles.examIcon}>
                    {publication.mode === "closed" ? (
                      <ShieldCheck aria-hidden="true" />
                    ) : (
                      <BookOpen aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <small>Online-Prüfung</small>
                    <h2>{quiz?.title ?? "Gelöschtes Quiz"}</h2>
                    <p>
                      {quiz?.questionIds.length ?? 0} Fragen ·{" "}
                      {quiz?.scoringMode === "per-topic"
                        ? "Jedes Thema bestehen"
                        : `Gesamtgrenze ${quiz?.passPercentage ?? 70} %`}
                    </p>
                  </div>
                  <label className={styles.statusToggle}>
                    <input
                      checked={publication.active}
                      onChange={(event) =>
                        updateExamPublication(publication.id, {
                          active: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span>{publication.active ? "Aktiv" : "Deaktiviert"}</span>
                  </label>
                </header>

                <div className={styles.settings}>
                  <label className={ui.field}>
                    <span>Prüfungsmodus</span>
                    <select
                      className={ui.input}
                      onChange={(event) =>
                        updateExamPublication(publication.id, {
                          mode: event.target.value as ExamMode,
                        })
                      }
                      value={publication.mode}
                    >
                      <option value="closed">Geschlossen</option>
                      <option value="open-book">Open Book</option>
                    </select>
                  </label>
                  <label className={ui.field}>
                    <span>Zeitlimit</span>
                    <div className={styles.unitInput}>
                      <Clock3 aria-hidden="true" />
                      <input
                        className={ui.input}
                        min="1"
                        onChange={(event) =>
                          updateExamPublication(publication.id, {
                            timeLimit: Math.max(
                              1,
                              Number(event.target.value),
                            ),
                          })
                        }
                        type="number"
                        value={publication.timeLimit}
                      />
                      <span>Min.</span>
                    </div>
                  </label>
                  <label className={ui.field}>
                    <span>Verstösse erlaubt</span>
                    <select
                      className={ui.input}
                      disabled={publication.mode === "open-book"}
                      onChange={(event) =>
                        updateExamPublication(publication.id, {
                          maxViolations: Number(event.target.value),
                        })
                      }
                      value={publication.maxViolations}
                    >
                      <option value="1">0 · sofort beenden</option>
                      <option value="2">1 · danach beenden</option>
                    </select>
                  </label>
                  <label className={styles.mailToggle}>
                    <Mail aria-hidden="true" />
                    <span>
                      <strong>Ergebnis per E-Mail</strong>
                      <small>Versand über Resend</small>
                    </span>
                    <input
                      checked={publication.sendResults}
                      onChange={(event) =>
                        updateExamPublication(publication.id, {
                          sendResults: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                  </label>
                </div>

                <footer>
                  <label className={styles.linkField}>
                    <span>Öffentlicher Prüfungslink</span>
                    <input readOnly value={link || `/exam/${publication.slug}`} />
                  </label>
                  <button
                    className={ui.button}
                    onClick={() => void copyLink(publication.slug)}
                    type="button"
                  >
                    <Copy aria-hidden="true" /> Link kopieren
                  </button>
                  <Link
                    className={`${ui.button} ${ui.primary}`}
                    href={`/exam/${publication.slug}`}
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" /> Testen
                  </Link>
                  <span className={styles.attempts}>
                    <Users aria-hidden="true" /> {attempts.length} Versuche
                  </span>
                </footer>
              </article>
            );
          })
        ) : (
          <div className={ui.card}>
            <EmptyState
              action={
                <button
                  className={`${ui.button} ${ui.primary}`}
                  disabled={!quizId}
                  onClick={createPublication}
                  type="button"
                >
                  Erste Prüfung veröffentlichen
                </button>
              }
              icon={ShieldCheck}
              text="Wähle oben ein Quiz aus und erzeuge einen öffentlichen Link."
              title="Noch keine Prüfungslinks"
            />
          </div>
        )}
      </section>
    </>
  );
}
