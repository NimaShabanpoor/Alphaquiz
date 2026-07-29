"use client";

import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ExternalLink,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import styles from "./page.module.css";

export default function ExamActivityPage() {
  const { state, resetExamAttempt, showToast } = useQuizApp();
  const attempts = state.examAttempts.filter(
    (attempt) => attempt.status !== "reset",
  );
  const liveAttempts = attempts.filter(
    (attempt) => attempt.status === "in-progress",
  );
  const completedAttempts = attempts.filter(
    (attempt) => attempt.status === "submitted",
  );
  const terminatedAttempts = attempts.filter(
    (attempt) => attempt.status === "terminated",
  );
  const violationEvents = state.examEvents.filter(
    (event) =>
      event.type === "tab-hidden" || event.type === "fullscreen-exit",
  );
  const newestViolation = violationEvents[0];

  function publicationDetails(publicationId: string) {
    const publication = state.examPublications.find(
      (item) => item.id === publicationId,
    );
    const quiz = state.quizzes.find(
      (item) => item.id === publication?.quizId,
    );
    return { publication, quiz };
  }

  return (
    <>
      <PageHeader
        actions={
          <Link className={`${ui.button} ${ui.primary}`} href="/exams">
            Prüfungen verwalten
          </Link>
        }
        eyebrow="Live-Überwachung"
        lead="Tabwechsel und das Verlassen des Vollbilds erscheinen sofort, auch wenn die Prüfung in einem zweiten Browser-Tab läuft."
        title="Prüfungsaktivität."
      />

      {newestViolation ? (
        <section className={styles.alert} role="status">
          <AlertTriangle aria-hidden="true" />
          <span>
            <strong>Neue Prüfungswarnung</strong>
            {state.examAttempts.find(
              (attempt) => attempt.id === newestViolation.attemptId,
            )?.name ?? "Teilnehmende Person"}{" "}
            · {newestViolation.message}
          </span>
          <time>
            {new Date(newestViolation.createdAt).toLocaleTimeString("de-CH")}
          </time>
        </section>
      ) : null}

      <section className={styles.stats}>
        <article className={ui.card}>
          <PlayCircle aria-hidden="true" />
          <strong>{liveAttempts.length}</strong>
          <span>Laufend</span>
        </article>
        <article className={ui.card}>
          <BellRing aria-hidden="true" />
          <strong>{violationEvents.length}</strong>
          <span>Meldungen</span>
        </article>
        <article className={ui.card}>
          <CheckCircle2 aria-hidden="true" />
          <strong>{completedAttempts.length}</strong>
          <span>Abgegeben</span>
        </article>
        <article className={ui.card}>
          <LockKeyhole aria-hidden="true" />
          <strong>{terminatedAttempts.length}</strong>
          <span>Beendet</span>
        </article>
      </section>

      <section className={styles.layout}>
        <article className={`${ui.card} ${styles.panel}`}>
          <header>
            <div>
              <small>Überwachung</small>
              <h2>Aktuelle Meldungen</h2>
            </div>
            <span className={ui.pill}>{violationEvents.length} Ereignisse</span>
          </header>
          {violationEvents.length ? (
            <div className={styles.eventList}>
              {violationEvents.map((event) => {
                const attempt = state.examAttempts.find(
                  (item) => item.id === event.attemptId,
                );
                const { quiz } = publicationDetails(event.publicationId);
                return (
                  <div className={styles.eventRow} key={event.id}>
                    <span className={styles.warningIcon}>
                      <AlertTriangle aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{attempt?.name ?? "Unbekannt"}</strong>
                      <small>
                        {attempt?.email} · {quiz?.title ?? "Prüfung"}
                      </small>
                    </span>
                    <span>
                      <strong>{event.message}</strong>
                      <small>
                        {new Date(event.createdAt).toLocaleString("de-CH")}
                      </small>
                    </span>
                    <span className={ui.pill} data-tone="draft">
                      {attempt?.violationCount ?? 0}. Verstoß
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={BellRing}
              text="Sobald jemand den Prüfungstab oder das Vollbild verlässt, erscheint die Meldung hier."
              title="Noch keine Verstöße"
            />
          )}
        </article>

        <article className={`${ui.card} ${styles.panel}`}>
          <header>
            <div>
              <small>Teilnehmende</small>
              <h2>Versuche</h2>
            </div>
            <span className={ui.pill}>{attempts.length} total</span>
          </header>
          {attempts.length ? (
            <div className={styles.attemptList}>
              {attempts.map((attempt) => {
                const { publication, quiz } = publicationDetails(
                  attempt.publicationId,
                );
                const statusLabel =
                  attempt.status === "in-progress"
                    ? "Läuft"
                    : attempt.status === "submitted"
                      ? "Abgegeben"
                      : "Beendet";
                return (
                  <article className={styles.attemptRow} key={attempt.id}>
                    <span
                      className={styles.statusDot}
                      data-status={attempt.status}
                    />
                    <span>
                      <strong>{attempt.name}</strong>
                      <small>
                        {quiz?.title ?? "Prüfung"} · Frage{" "}
                        {attempt.currentQuestion + 1}
                      </small>
                    </span>
                    <span>
                      <strong>{statusLabel}</strong>
                      <small>
                        {attempt.status === "in-progress"
                          ? `${attempt.violationCount} Verstöße`
                          : `${attempt.percentage} % · ${
                              attempt.passed
                                ? "Bestanden"
                                : "Nicht bestanden"
                            }`}
                      </small>
                    </span>
                    {attempt.status !== "in-progress" ? (
                      <button
                        className={ui.button}
                        onClick={() => {
                          resetExamAttempt(attempt.id);
                          showToast(
                            `${attempt.name} wurde für einen neuen Versuch freigeschaltet.`,
                          );
                        }}
                        type="button"
                      >
                        <RotateCcw aria-hidden="true" /> Freigeben
                      </button>
                    ) : publication ? (
                      <Link
                        aria-label="Prüfungslink öffnen"
                        className={`${ui.button} ${ui.quiet}`}
                        href={`/exam/${publication.slug}`}
                        target="_blank"
                      >
                        <ExternalLink aria-hidden="true" />
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              text="Öffne einen Prüfungslink in einem zweiten Tab und starte einen Versuch."
              title="Noch keine Teilnehmenden"
            />
          )}
        </article>
      </section>
    </>
  );
}
