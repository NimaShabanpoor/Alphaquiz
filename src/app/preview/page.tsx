"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

function PreviewContent() {
  const searchParams = useSearchParams();
  const { state } = useQuizApp();
  const requestedId = searchParams.get("quiz");
  const [quizId, setQuizId] = useState(
    requestedId ?? state.quizzes[0]?.id ?? "",
  );
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);
  const quiz = state.quizzes.find((item) => item.id === quizId);
  const questions = useMemo(
    () =>
      quiz?.questionIds
        .map((id) => state.questions.find((question) => question.id === id))
        .filter((question) => question !== undefined) ?? [],
    [quiz, state.questions],
  );
  const question = questions[index];

  function choose(answerId: string) {
    if (!question) return;
    setResponses((current) => {
      const selected = current[question.id] ?? [];
      const next =
        question.type === "multiple"
          ? selected.includes(answerId)
            ? selected.filter((id) => id !== answerId)
            : [...selected, answerId]
          : [answerId];
      return { ...current, [question.id]: next };
    });
  }

  const score = questions.reduce((total, item) => {
    if (item.type === "text") {
      const given = (responses[item.id]?.[0] ?? "").trim().toLowerCase();
      const correct = item.answers.some(
        (answer) =>
          answer.correct && answer.text.trim().toLowerCase() === given,
      );
      return total + (correct ? item.points : 0);
    }
    const chosen = new Set(responses[item.id] ?? []);
    const correct = item.answers.every(
      (answer) => chosen.has(answer.id) === answer.correct,
    );
    return total + (correct ? item.points : 0);
  }, 0);
  const possible = questions.reduce((total, item) => total + item.points, 0);

  if (!state.quizzes.length) {
    return (
      <EmptyState
        icon={CheckCircle2}
        text="Erstelle zuerst ein Quiz, um es hier als Teilnehmende oder Teilnehmender zu testen."
        title="Keine Vorschau verfügbar"
      />
    );
  }

  return (
    <>
      <PageHeader
        actions={
          quiz ? (
            <Link className={ui.button} href={`/quizzes/${quiz.id}`}>
              <ArrowLeft aria-hidden="true" /> Bearbeiten
            </Link>
          ) : null
        }
        eyebrow="Teilnehmenden-Vorschau"
        lead="Teste Navigation, Antworten und Auswertung vor dem Export."
        title={quiz?.title ?? "Quiz-Vorschau"}
      />

      <label className={`${ui.field} ${styles.quizSelect}`}>
        <span>Quiz auswählen</span>
        <select
          className={ui.input}
          onChange={(event) => {
            setQuizId(event.target.value);
            setIndex(0);
            setResponses({});
            setFinished(false);
          }}
          value={quizId}
        >
          {state.quizzes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>

      <section className={`${ui.card} ${styles.player}`}>
        {!question ? (
          <EmptyState
            icon={CheckCircle2}
            text="Füge im Quiz-Editor mindestens eine Frage hinzu."
            title="Dieses Quiz ist leer"
          />
        ) : finished ? (
          <div className={styles.result}>
            <span>
              <CheckCircle2 aria-hidden="true" />
            </span>
            <p>Quiz abgeschlossen</p>
            <h2>
              {score} von {possible} Punkten
            </h2>
            <small>
              Das entspricht{" "}
              {possible ? Math.round((score / possible) * 100) : 0} %.
            </small>
            <button
              className={`${ui.button} ${ui.primary}`}
              onClick={() => {
                setResponses({});
                setIndex(0);
                setFinished(false);
              }}
              type="button"
            >
              <RotateCcw aria-hidden="true" /> Noch einmal
            </button>
          </div>
        ) : (
          <>
            <div className={styles.progressTop}>
              <div className={styles.progress}>
                <span
                  style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                />
              </div>
              <small>
                {index + 1} / {questions.length}
              </small>
            </div>
            <div className={styles.body}>
              <p className={styles.kicker}>
                {questionTypeLabels[question.type]} · {question.points}{" "}
                {question.points === 1 ? "Punkt" : "Punkte"}
              </p>
              <h2>{question.title}</h2>
              <p className={styles.description}>
                {question.description ||
                  (question.type === "multiple"
                    ? "Mehrere Antworten können richtig sein."
                    : "Wähle die passende Antwort.")}
              </p>
              {question.type === "text" ? (
                <textarea
                  className={`${ui.input} ${styles.textAnswer}`}
                  onChange={(event) =>
                    setResponses((current) => ({
                      ...current,
                      [question.id]: [event.target.value],
                    }))
                  }
                  placeholder="Antwort eingeben …"
                  value={responses[question.id]?.[0] ?? ""}
                />
              ) : (
                <div className={styles.options}>
                  {question.answers.map((answer, answerIndex) => {
                    const selected = (
                      responses[question.id] ?? []
                    ).includes(answer.id);
                    return (
                      <button
                        aria-pressed={selected}
                        data-selected={selected}
                        key={answer.id}
                        onClick={() => choose(answer.id)}
                        type="button"
                      >
                        <span>{String.fromCharCode(65 + answerIndex)}</span>
                        {answer.text}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className={styles.actions}>
                <button
                  className={ui.button}
                  disabled={index === 0}
                  onClick={() => setIndex((current) => current - 1)}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" /> Zurück
                </button>
                <button
                  className={`${ui.button} ${ui.primary}`}
                  onClick={() => {
                    if (index === questions.length - 1) setFinished(true);
                    else setIndex((current) => current + 1);
                  }}
                  type="button"
                >
                  {index === questions.length - 1 ? "Abschließen" : "Weiter"}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<p>Vorschau wird geladen …</p>}>
      <PreviewContent />
    </Suspense>
  );
}
