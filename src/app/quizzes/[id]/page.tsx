"use client";

import {
  ArrowLeft,
  Check,
  Eye,
  FileOutput,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import type { Answer, Question, QuestionType } from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

function normalizeAnswers(question: Question, type: QuestionType): Answer[] {
  if (type === "boolean") {
    return [
      { id: `${question.id}-true`, text: "Wahr", correct: true },
      { id: `${question.id}-false`, text: "Falsch", correct: false },
    ];
  }
  if (type === "text") {
    return [
      question.answers[0] ?? {
        id: `${question.id}-text`,
        text: "",
        correct: true,
      },
    ];
  }
  const answers =
    question.answers.length >= 2
      ? question.answers
      : [
          ...question.answers,
          {
            id: `${question.id}-answer-2`,
            text: "Antwort 2",
            correct: false,
          },
        ];
  if (type === "single") {
    const correctIndex = Math.max(
      0,
      answers.findIndex((answer) => answer.correct),
    );
    return answers.map((answer, index) => ({
      ...answer,
      correct: index === correctIndex,
    }));
  }
  return answers;
}

export default function QuizEditorPage() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const {
    state,
    updateQuiz,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    addQuestionToQuiz,
    removeQuestionFromQuiz,
    showToast,
  } = useQuizApp();
  const quiz = state.quizzes.find((item) => item.id === quizId);
  const quizQuestions = useMemo(
    () =>
      quiz?.questionIds
        .map((id) => state.questions.find((question) => question.id === id))
        .filter((question): question is Question => Boolean(question)) ?? [],
    [quiz, state.questions],
  );
  const [activeId, setActiveId] = useState("");

  if (!quiz) {
    return (
      <EmptyState
        action={
          <Link className={ui.button} href="/quizzes">
            <ArrowLeft aria-hidden="true" /> Zur Quizliste
          </Link>
        }
        icon={FileOutput}
        text="Das Quiz wurde gelöscht oder ist auf diesem Gerät nicht vorhanden."
        title="Quiz nicht gefunden"
      />
    );
  }

  const resolvedActiveId = quizQuestions.some(
    (question) => question.id === activeId,
  )
    ? activeId
    : (quizQuestions[0]?.id ?? "");
  const activeQuestion = quizQuestions.find(
    (question) => question.id === resolvedActiveId,
  );

  function addNewQuestion() {
    if (!quiz) return;
    const questionId = createQuestion(quiz.categoryId);
    addQuestionToQuiz(quiz.id, questionId);
    setActiveId(questionId);
  }

  function patchQuestion(patch: Partial<Question>) {
    if (activeQuestion) updateQuestion(activeQuestion.id, patch);
  }

  function updateAnswer(answerId: string, patch: Partial<Answer>) {
    if (!activeQuestion) return;
    patchQuestion({
      answers: activeQuestion.answers.map((answer) =>
        answer.id === answerId ? { ...answer, ...patch } : answer,
      ),
    });
  }

  function toggleCorrect(answerId: string) {
    if (!activeQuestion) return;
    const onlyOne =
      activeQuestion.type === "single" || activeQuestion.type === "boolean";
    patchQuestion({
      answers: activeQuestion.answers.map((answer) => ({
        ...answer,
        correct:
          answer.id === answerId
            ? onlyOne
              ? true
              : !answer.correct
            : onlyOne
              ? false
              : answer.correct,
      })),
    });
  }

  function changeType(type: QuestionType) {
    if (!activeQuestion) return;
    patchQuestion({
      type,
      answers: normalizeAnswers(activeQuestion, type),
    });
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <Link className={ui.button} href={`/preview?quiz=${quiz.id}`}>
              <Eye aria-hidden="true" />
              Vorschau
            </Link>
            <button
              className={ui.button}
              onClick={() => showToast("Alle Änderungen sind gespeichert.")}
              type="button"
            >
              <Save aria-hidden="true" />
              Speichern
            </button>
            <Link
              className={`${ui.button} ${ui.primary}`}
              href={`/export?quiz=${quiz.id}`}
            >
              <FileOutput aria-hidden="true" />
              Exportieren
            </Link>
          </>
        }
        eyebrow="Quiz bearbeiten"
        lead={`${quizQuestions.length} Fragen · Änderungen werden automatisch auf diesem Gerät gespeichert.`}
        title={quiz.title}
      />

      <section className={styles.quizMeta}>
        <label className={ui.field}>
          <span>Titel</span>
          <input
            className={ui.input}
            onChange={(event) =>
              updateQuiz(quiz.id, { title: event.target.value })
            }
            value={quiz.title}
          />
        </label>
        <label className={ui.field}>
          <span>Kategorie</span>
          <select
            className={ui.input}
            onChange={(event) =>
              updateQuiz(quiz.id, { categoryId: event.target.value })
            }
            value={quiz.categoryId}
          >
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          <span>Status</span>
          <select
            className={ui.input}
            onChange={(event) =>
              updateQuiz(quiz.id, {
                status: event.target.value as typeof quiz.status,
              })
            }
            value={quiz.status}
          >
            <option value="draft">Entwurf</option>
            <option value="ready">Bereit</option>
            <option value="exported">Exportiert</option>
          </select>
        </label>
      </section>

      <section className={styles.editorGrid}>
        <aside className={`${ui.card} ${styles.questionList}`}>
          {quizQuestions.map((question, index) => (
            <button
              className={styles.questionItem}
              data-active={question.id === activeQuestion?.id}
              key={question.id}
              onClick={() => setActiveId(question.id)}
              type="button"
            >
              <span>{index + 1}</span>
              <span>
                <strong>{question.title || "Unbenannte Frage"}</strong>
                <small>
                  {questionTypeLabels[question.type]} · {question.points} P.
                </small>
              </span>
            </button>
          ))}
          <button
            className={styles.addQuestion}
            onClick={addNewQuestion}
            type="button"
          >
            <Plus aria-hidden="true" />
            Frage hinzufügen
          </button>
        </aside>

        <article className={`${ui.card} ${styles.editor}`}>
          {activeQuestion ? (
            <>
              <div className={styles.editorTop}>
                <strong>
                  Frage {quizQuestions.indexOf(activeQuestion) + 1}
                </strong>
                <button
                  className={`${ui.button} ${ui.quiet} ${ui.danger}`}
                  onClick={() => {
                    removeQuestionFromQuiz(quiz.id, activeQuestion.id);
                    if (
                      !state.quizzes.some(
                        (item) =>
                          item.id !== quiz.id &&
                          item.questionIds.includes(activeQuestion.id),
                      )
                    ) {
                      deleteQuestion(activeQuestion.id);
                    }
                    showToast("Frage wurde aus dem Quiz entfernt.");
                  }}
                  type="button"
                >
                  <Trash2 aria-hidden="true" /> Entfernen
                </button>
              </div>
              <div className={styles.editorBody}>
                <div className={ui.field}>
                  <label>Antwortformat</label>
                  <div className={styles.formats}>
                    {(Object.keys(questionTypeLabels) as QuestionType[]).map(
                      (type) => (
                        <button
                          aria-pressed={activeQuestion.type === type}
                          data-active={activeQuestion.type === type}
                          key={type}
                          onClick={() => changeType(type)}
                          type="button"
                        >
                          {questionTypeLabels[type]}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <label className={ui.field}>
                  <span>Frage</span>
                  <input
                    className={ui.input}
                    onChange={(event) =>
                      patchQuestion({ title: event.target.value })
                    }
                    value={activeQuestion.title}
                  />
                </label>

                <label className={ui.field}>
                  <span>Beschreibung (optional)</span>
                  <textarea
                    className={`${ui.input} ${styles.textarea}`}
                    onChange={(event) =>
                      patchQuestion({ description: event.target.value })
                    }
                    value={activeQuestion.description}
                  />
                </label>

                <div className={ui.field}>
                  <label>
                    {activeQuestion.type === "order"
                      ? "Elemente in richtiger Reihenfolge"
                      : activeQuestion.type === "text"
                        ? "Musterantwort"
                        : "Antworten · richtige markieren"}
                  </label>
                  <div className={styles.answers}>
                    {activeQuestion.answers.map((answer) => (
                      <div
                        className={styles.answer}
                        data-correct={answer.correct}
                        key={answer.id}
                      >
                        {activeQuestion.type === "order" ? (
                          <GripVertical aria-hidden="true" />
                        ) : (
                          <button
                            aria-label="Richtige Antwort umschalten"
                            className={styles.correct}
                            onClick={() => toggleCorrect(answer.id)}
                            type="button"
                          >
                            <Check aria-hidden="true" />
                          </button>
                        )}
                        <input
                          aria-label="Antworttext"
                          onChange={(event) =>
                            updateAnswer(answer.id, {
                              text: event.target.value,
                            })
                          }
                          value={answer.text}
                        />
                        {activeQuestion.type !== "boolean" &&
                        activeQuestion.answers.length > 1 ? (
                          <button
                            aria-label="Antwort löschen"
                            className={styles.answerDelete}
                            onClick={() =>
                              patchQuestion({
                                answers: activeQuestion.answers.filter(
                                  (item) => item.id !== answer.id,
                                ),
                              })
                            }
                            type="button"
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {activeQuestion.type !== "boolean" ? (
                    <button
                      className={styles.addQuestion}
                      onClick={() =>
                        patchQuestion({
                          answers: [
                            ...activeQuestion.answers,
                            {
                              id: `answer-${crypto.randomUUID()}`,
                              text: "",
                              correct: false,
                            },
                          ],
                        })
                      }
                      type="button"
                    >
                      <Plus aria-hidden="true" /> Antwort hinzufügen
                    </button>
                  ) : null}
                </div>

                <div className={styles.fieldRow}>
                  <label className={ui.field}>
                    <span>Kategorie</span>
                    <select
                      className={ui.input}
                      onChange={(event) =>
                        patchQuestion({ categoryId: event.target.value })
                      }
                      value={activeQuestion.categoryId}
                    >
                      {state.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={ui.field}>
                    <span>Punkte</span>
                    <input
                      className={ui.input}
                      min="0"
                      onChange={(event) =>
                        patchQuestion({
                          points: Math.max(0, Number(event.target.value)),
                        })
                      }
                      type="number"
                      value={activeQuestion.points}
                    />
                  </label>
                  <label className={ui.field}>
                    <span>Antworten mischen</span>
                    <select
                      className={ui.input}
                      onChange={(event) =>
                        patchQuestion({ shuffle: event.target.value === "yes" })
                      }
                      value={activeQuestion.shuffle ? "yes" : "no"}
                    >
                      <option value="yes">Ja</option>
                      <option value="no">Nein</option>
                    </select>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              action={
                <button
                  className={`${ui.button} ${ui.primary}`}
                  onClick={addNewQuestion}
                  type="button"
                >
                  <Plus aria-hidden="true" /> Erste Frage hinzufügen
                </button>
              }
              icon={Plus}
              text="Füge eine bestehende oder neue Frage hinzu."
              title="Dieses Quiz ist noch leer"
            />
          )}
        </article>
      </section>
    </>
  );
}
