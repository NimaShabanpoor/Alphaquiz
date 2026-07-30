"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import { examTopicId } from "@/lib/exam-randomization";
import { calculateQuestionScore } from "@/lib/exam-scoring";
import type { Question } from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

function responseText(question: Question, responseIds: string[]) {
  if (question.type === "text") {
    return responseIds[0]?.trim() || "Keine Antwort";
  }
  const answers = responseIds
    .map((id) => question.answers.find((answer) => answer.id === id)?.text)
    .filter((answer): answer is string => Boolean(answer));
  return answers.length ? answers.join(" · ") : "Keine Antwort";
}

function correctText(question: Question) {
  const answers = question.answers
    .filter((answer) => answer.correct)
    .map((answer) => answer.text);
  return answers.length ? answers.join(" · ") : "Keine Musterlösung hinterlegt";
}

export default function ExamAttemptResultPage() {
  const params = useParams<{ attemptId: string }>();
  const { state } = useQuizApp();
  const [onlyErrors, setOnlyErrors] = useState(true);
  const attempt = state.examAttempts.find(
    (item) => item.id === params.attemptId,
  );
  const publication = state.examPublications.find(
    (item) => item.id === attempt?.publicationId,
  );
  const quiz = state.quizzes.find(
    (item) => item.id === publication?.quizId,
  );
  const quizQuestions = useMemo(
    () =>
      quiz?.questionIds
        .map((id) => state.questions.find((question) => question.id === id))
        .filter((question): question is Question => Boolean(question)) ?? [],
    [quiz, state.questions],
  );
  const questions = attempt?.instance?.questions ?? quizQuestions;
  const questionResults = useMemo(
    () =>
      questions.map((question, index) => {
        const score = attempt
          ? calculateQuestionScore(question, attempt.responses)
          : 0;
        return {
          question,
          index,
          score,
          correct: question.points > 0 && score === question.points,
          response: attempt?.responses[question.id] ?? [],
        };
      }),
    [attempt, questions],
  );
  const mistakes = questionResults.filter((result) => !result.correct);
  const visibleResults = onlyErrors ? mistakes : questionResults;
  const events = state.examEvents.filter(
    (event) => event.attemptId === attempt?.id,
  );

  if (!attempt || !publication || !quiz) {
    return (
      <EmptyState
        action={
          <Link className={ui.button} href="/exam-activity">
            <ArrowLeft aria-hidden="true" /> Zur Prüfungsaktivität
          </Link>
        }
        icon={XCircle}
        text="Der Versuch oder die zugehörige Prüfung wurde gelöscht."
        title="Resultat nicht gefunden"
      />
    );
  }

  const statusLabel =
    attempt.status === "submitted"
      ? "Abgegeben"
      : attempt.status === "terminated"
        ? "Wegen Regelverstoss beendet"
        : attempt.status === "reset"
          ? "Für neuen Versuch freigegeben"
          : "Prüfung läuft";

  return (
    <>
      <PageHeader
        actions={
          <Link className={ui.button} href="/exam-activity">
            <ArrowLeft aria-hidden="true" /> Zurück
          </Link>
        }
        eyebrow="Schülerresultat"
        lead={`${quiz.title} · ${attempt.email}`}
        title={attempt.name}
      />

      <section className={`${ui.card} ${styles.resultHead}`}>
        <div className={styles.scoreCircle} data-passed={attempt.passed}>
          <strong>{attempt.percentage} %</strong>
          <span>{attempt.passed ? "Bestanden" : "Nicht bestanden"}</span>
        </div>
        <div className={styles.resultCopy}>
          <span className={ui.pill} data-tone={attempt.passed ? "ready" : "draft"}>
            {statusLabel}
          </span>
          <h2>
            {attempt.score} von {attempt.possible} Punkten
          </h2>
          <p>
            {questions.length
              ? `${mistakes.length} von ${questions.length} Fragen falsch beantwortet`
              : "Keine Fragen konnten ausgewertet werden"}
          </p>
        </div>
        <dl className={styles.meta}>
          <div>
            <dt>
              <Mail aria-hidden="true" /> E-Mail
            </dt>
            <dd>{attempt.email}</dd>
          </div>
          <div>
            <dt>
              <Clock3 aria-hidden="true" /> Gestartet
            </dt>
            <dd>{new Date(attempt.startedAt).toLocaleString("de-CH")}</dd>
          </div>
          <div>
            <dt>
              <AlertTriangle aria-hidden="true" /> Verstösse
            </dt>
            <dd>{attempt.violationCount}</dd>
          </div>
        </dl>
      </section>

      {attempt.topicResults.length ? (
        <section className={`${ui.card} ${styles.topics}`}>
          <header>
            <small>Auswertung</small>
            <h2>Resultat nach Unterkategorie</h2>
          </header>
          <div>
            {attempt.topicResults.map((topicResult) => (
              <article key={topicResult.topicId}>
                <span>
                  <strong>{topicResult.name}</strong>
                  <small>
                    {topicResult.score}/{topicResult.possible} Punkte · Grenze{" "}
                    {topicResult.required} %
                  </small>
                </span>
                <span
                  className={ui.pill}
                  data-tone={topicResult.passed ? "ready" : "draft"}
                >
                  {topicResult.percentage} % ·{" "}
                  {topicResult.passed ? "Bestanden" : "Nicht bestanden"}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.questionSection}>
        <header className={styles.questionHeader}>
          <div>
            <small>Antwortkontrolle</small>
            <h2>Wo wurden Fehler gemacht?</h2>
          </div>
          <div className={styles.filterButtons}>
            <button
              aria-pressed={onlyErrors}
              onClick={() => setOnlyErrors(true)}
              type="button"
            >
              Nur Fehler ({mistakes.length})
            </button>
            <button
              aria-pressed={!onlyErrors}
              onClick={() => setOnlyErrors(false)}
              type="button"
            >
              Alle Fragen ({questionResults.length})
            </button>
          </div>
        </header>

        {!questionResults.length ? (
          <div className={`${ui.card} ${styles.noEvaluation}`}>
            <XCircle aria-hidden="true" />
            <span>
              <strong>Keine Fragen wurden ausgewertet.</strong>
              <small>0 von 0 gilt als nicht bestanden.</small>
            </span>
          </div>
        ) : visibleResults.length ? (
          <div className={styles.questionList}>
            {visibleResults.map(
              ({ question, index, score, correct, response }) => (
                <article
                  className={`${ui.card} ${styles.questionCard}`}
                  data-correct={correct}
                  key={question.id}
                >
                  <header>
                    <span className={styles.resultIcon}>
                      {correct ? (
                        <CheckCircle2 aria-hidden="true" />
                      ) : (
                        <XCircle aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <small>
                        Frage {index + 1} ·{" "}
                        {attempt.instance?.topicLabelById[
                          examTopicId(
                            question,
                            attempt.instance.quizSnapshot,
                            attempt.instance.configSnapshot.useTopics,
                          )
                        ] ??
                          state.topics.find(
                            (topic) => topic.id === question.topicId,
                          )?.name ??
                          "Ohne Unterkategorie"}{" "}
                        · {questionTypeLabels[question.type]}
                      </small>
                      <h3>{question.title}</h3>
                    </span>
                    <strong>
                      {score}/{question.points} P.
                    </strong>
                  </header>
                  {question.image ? (
                    <Image
                      alt={question.image.alt || "Bild zur Frage"}
                      className={styles.questionImage}
                      height={420}
                      src={question.image.dataUrl}
                      unoptimized
                      width={720}
                    />
                  ) : null}
                  <div className={styles.answerComparison}>
                    <div data-answer={correct ? "correct" : "wrong"}>
                      <span>Antwort des Schülers</span>
                      <strong>{responseText(question, response)}</strong>
                    </div>
                    <div data-answer="correct">
                      <span>Richtige Lösung</span>
                      <strong>{correctText(question)}</strong>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className={`${ui.card} ${styles.noErrors}`}>
            <CheckCircle2 aria-hidden="true" />
            <strong>Alle Fragen wurden richtig beantwortet.</strong>
          </div>
        )}
      </section>

      {events.length ? (
        <section className={`${ui.card} ${styles.events}`}>
          <header>
            <small>Protokoll</small>
            <h2>Prüfungsverlauf</h2>
          </header>
          {events.map((event) => (
            <div key={event.id}>
              <span>{event.message}</span>
              <time>{new Date(event.createdAt).toLocaleString("de-CH")}</time>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
