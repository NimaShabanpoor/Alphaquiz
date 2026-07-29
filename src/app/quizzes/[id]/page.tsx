"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  FileOutput,
  FolderPlus,
  GripVertical,
  ImageIcon,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { QuestionImageField } from "@/components/question-image-field";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import type {
  Answer,
  Question,
  QuestionType,
  ScoringMode,
} from "@/lib/quiz-types";
import { questionTypeLabels, scoringModeLabels } from "@/lib/quiz-types";
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
    createTopic,
    updateQuestion,
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
  const [showPool, setShowPool] = useState(false);
  const [poolQuery, setPoolQuery] = useState("");
  const [poolTopicId, setPoolTopicId] = useState("all");
  const [poolTargetTopicId, setPoolTargetTopicId] = useState("");
  const [collapsedTopics, setCollapsedTopics] = useState<string[]>([]);
  const [showTopicCreator, setShowTopicCreator] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

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

  const categoryTopics = state.topics.filter(
    (topic) => topic.categoryId === quiz.categoryId,
  );
  const quizTopicIds = Array.from(
    new Set(quizQuestions.map((question) => question.topicId).filter(Boolean)),
  );
  const poolQuestions = state.questions.filter((question) => {
    const needle = poolQuery.trim().toLowerCase();
    return (
      question.categoryId === quiz.categoryId &&
      !quiz.questionIds.includes(question.id) &&
      (poolTopicId === "all" || question.topicId === poolTopicId) &&
      (!needle ||
        question.title.toLowerCase().includes(needle) ||
        question.description.toLowerCase().includes(needle))
    );
  });

  function addNewQuestion(topicId?: string) {
    if (!quiz) return;
    const questionId = createQuestion(
      quiz.categoryId,
      topicId ??
        (poolTargetTopicId ||
          (poolTopicId === "all" ? categoryTopics[0]?.id : poolTopicId)),
    );
    addQuestionToQuiz(quiz.id, questionId);
    setActiveId(questionId);
    setShowPool(false);
  }

  function openPoolForTopic(topicId: string) {
    setPoolTopicId("all");
    setPoolTargetTopicId(topicId);
    setShowPool(true);
  }

  function addTopic() {
    const name = newTopicName.trim();
    if (!name || !quiz) return;
    const topicId = createTopic(quiz.categoryId, name);
    setNewTopicName("");
    setShowTopicCreator(false);
    setCollapsedTopics((current) =>
      current.filter((currentId) => currentId !== topicId),
    );
    showToast(`Unterkategorie „${name}“ wurde erstellt.`);
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

      <section className={`${ui.card} ${styles.scoring}`}>
        <div className={styles.scoringIntro}>
          <div>
            <span>Auswertung</span>
            <h2>Wie wird die Prüfung bestanden?</h2>
          </div>
          <p>
            Entscheide, ob alle Punkte zusammengezählt werden oder jedes Thema
            einzeln bestanden werden muss.
          </p>
        </div>
        <label className={ui.field}>
          <span>Berechnung</span>
          <select
            className={ui.input}
            onChange={(event) =>
              updateQuiz(quiz.id, {
                scoringMode: event.target.value as ScoringMode,
              })
            }
            value={quiz.scoringMode}
          >
            {(Object.keys(scoringModeLabels) as ScoringMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {scoringModeLabels[mode]}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          <span>Gesamtgrenze</span>
          <div className={styles.percentInput}>
            <input
              className={ui.input}
              max="100"
              min="0"
              onChange={(event) =>
                updateQuiz(quiz.id, {
                  passPercentage: Math.min(
                    100,
                    Math.max(0, Number(event.target.value)),
                  ),
                })
              }
              type="number"
              value={quiz.passPercentage}
            />
            <span>%</span>
          </div>
        </label>
        {quiz.scoringMode === "per-topic" ? (
          <div className={styles.topicThresholds}>
            <strong>Bestehensgrenze je enthaltenem Thema</strong>
            {quizTopicIds.length ? (
              quizTopicIds.map((topicId) => {
                const topic = state.topics.find((item) => item.id === topicId);
                return (
                  <label key={topicId}>
                    <span>
                      <Tags aria-hidden="true" />
                      {topic?.name ?? "Ohne Thema"}
                    </span>
                    <div className={styles.percentInput}>
                      <input
                        className={ui.input}
                        max="100"
                        min="0"
                        onChange={(event) =>
                          updateQuiz(quiz.id, {
                            topicPassPercentages: {
                              ...quiz.topicPassPercentages,
                              [topicId]: Math.min(
                                100,
                                Math.max(0, Number(event.target.value)),
                              ),
                            },
                          })
                        }
                        type="number"
                        value={
                          quiz.topicPassPercentages[topicId] ??
                          quiz.passPercentage
                        }
                      />
                      <span>%</span>
                    </div>
                  </label>
                );
              })
            ) : (
              <small>Füge zuerst Fragen aus mindestens einem Thema hinzu.</small>
            )}
          </div>
        ) : null}
      </section>

      <section className={styles.editorGrid}>
        <aside className={`${ui.card} ${styles.questionList}`}>
          <div className={styles.topicListHead}>
            <span>Unterkategorien</span>
            <button
              aria-label="Unterkategorie erstellen"
              onClick={() => setShowTopicCreator((current) => !current)}
              type="button"
            >
              <FolderPlus aria-hidden="true" />
            </button>
          </div>
          {showTopicCreator ? (
            <div className={styles.topicCreator}>
              <input
                autoFocus
                onChange={(event) => setNewTopicName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addTopic();
                  if (event.key === "Escape") setShowTopicCreator(false);
                }}
                placeholder="z. B. Grundlagen"
                value={newTopicName}
              />
              <button
                disabled={!newTopicName.trim()}
                onClick={addTopic}
                type="button"
              >
                Anlegen
              </button>
            </div>
          ) : null}
          {categoryTopics.map((topic) => {
            const topicQuestions = quizQuestions.filter(
              (question) => question.topicId === topic.id,
            );
            const collapsed = collapsedTopics.includes(topic.id);
            return (
              <div className={styles.topicGroup} key={topic.id}>
                <button
                  aria-expanded={!collapsed}
                  className={styles.topicHeader}
                  onClick={() =>
                    setCollapsedTopics((current) =>
                      collapsed
                        ? current.filter((id) => id !== topic.id)
                        : [...current, topic.id],
                    )
                  }
                  type="button"
                >
                  <ChevronRight aria-hidden="true" />
                  <span>
                    <strong>{topic.name}</strong>
                    <small>
                      {topicQuestions.length}{" "}
                      {topicQuestions.length === 1 ? "Frage" : "Fragen"}
                    </small>
                  </span>
                </button>
                {!collapsed ? (
                  <div className={styles.topicQuestions}>
                    {topicQuestions.map((question) => (
                      <button
                        className={styles.questionItem}
                        data-active={question.id === activeQuestion?.id}
                        key={question.id}
                        onClick={() => setActiveId(question.id)}
                        type="button"
                      >
                        <span>
                          {quizQuestions.indexOf(question) + 1}
                        </span>
                        <span>
                          <strong>
                            {question.title || "Unbenannte Frage"}
                          </strong>
                          <small>
                            {question.image ? (
                              <ImageIcon aria-label="Mit Bild" />
                            ) : null}
                            {question.points} P.
                          </small>
                        </span>
                      </button>
                    ))}
                    <button
                      className={styles.topicAdd}
                      onClick={() => openPoolForTopic(topic.id)}
                      type="button"
                    >
                      <Plus aria-hidden="true" /> Frage zuordnen
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            className={styles.addQuestion}
            onClick={() => {
              setPoolTargetTopicId(activeQuestion?.topicId ?? "");
              setShowPool(true);
            }}
            type="button"
          >
            <Plus aria-hidden="true" />
            Aus Fragenpool hinzufügen
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
                    showToast(
                      "Frage wurde aus dem Quiz entfernt und bleibt im Fragenpool.",
                    );
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

                <QuestionImageField
                  image={activeQuestion.image}
                  onChange={(image) => patchQuestion({ image })}
                  onError={showToast}
                />

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
                      onChange={(event) => {
                        const nextCategoryId = event.target.value;
                        patchQuestion({
                          categoryId: nextCategoryId,
                          topicId:
                            state.topics.find(
                              (topic) =>
                                topic.categoryId === nextCategoryId,
                            )?.id ?? "",
                        });
                      }}
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
                    <span>Unterthema</span>
                    <select
                      className={ui.input}
                      onChange={(event) =>
                        patchQuestion({ topicId: event.target.value })
                      }
                      value={activeQuestion.topicId}
                    >
                      {state.topics
                        .filter(
                          (topic) =>
                            topic.categoryId === activeQuestion.categoryId,
                        )
                        .map((topic) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.name}
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
                  onClick={() => setShowPool(true)}
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

      {showPool ? (
        <div className={styles.modalBackdrop}>
          <section
            aria-labelledby="question-pool-title"
            aria-modal="true"
            className={`${ui.card} ${styles.poolModal}`}
            role="dialog"
          >
            <header className={styles.poolHead}>
              <div>
                <small>Fragenpool</small>
                <h2 id="question-pool-title">
                  Fragen für „{quiz.title}“ auswählen
                </h2>
              </div>
              <button
                aria-label="Fragenpool schließen"
                className={`${ui.button} ${ui.quiet}`}
                onClick={() => setShowPool(false)}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className={styles.poolFilters}>
              <label className={styles.poolSearch}>
                <Search aria-hidden="true" />
                <input
                  aria-label="Fragenpool durchsuchen"
                  onChange={(event) => setPoolQuery(event.target.value)}
                  placeholder="Frage suchen …"
                  value={poolQuery}
                />
              </label>
              <select
                aria-label="Unterthema auswählen"
                className={ui.input}
                onChange={(event) => setPoolTopicId(event.target.value)}
                value={poolTopicId}
              >
                <option value="all">Alle Unterthemen</option>
                {categoryTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
              <button
                className={`${ui.button} ${ui.primary}`}
                onClick={() => addNewQuestion()}
                type="button"
              >
                <Plus aria-hidden="true" /> Neue Frage erstellen
              </button>
            </div>
            <div className={styles.poolAssignment}>
              <span>
                <Tags aria-hidden="true" />
                Beim Hinzufügen zuordnen zu
              </span>
              <select
                className={ui.input}
                onChange={(event) => setPoolTargetTopicId(event.target.value)}
                value={poolTargetTopicId}
              >
                <option value="">Bisheriges Unterthema behalten</option>
                {categoryTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.poolList}>
              {poolQuestions.length ? (
                poolQuestions.map((question) => {
                  const topic = state.topics.find(
                    (item) => item.id === question.topicId,
                  );
                  return (
                    <article className={styles.poolRow} key={question.id}>
                      {question.image ? (
                        <Image
                          alt={question.image.alt || ""}
                          className={styles.poolThumb}
                          height={44}
                          src={question.image.dataUrl}
                          unoptimized
                          width={58}
                        />
                      ) : (
                        <span className={styles.poolMark}>
                          <Tags aria-hidden="true" />
                        </span>
                      )}
                      <span>
                        <strong>{question.title}</strong>
                        <small>
                          {topic?.name ?? "Ohne Thema"} ·{" "}
                          {questionTypeLabels[question.type]} · {question.points}{" "}
                          {question.points === 1 ? "Punkt" : "Punkte"}
                        </small>
                      </span>
                      <button
                        className={ui.button}
                        onClick={() => {
                          if (
                            poolTargetTopicId &&
                            question.topicId !== poolTargetTopicId
                          ) {
                            updateQuestion(question.id, {
                              topicId: poolTargetTopicId,
                            });
                          }
                          addQuestionToQuiz(quiz.id, question.id);
                          setActiveId(question.id);
                          showToast("Frage wurde aus dem Pool hinzugefügt.");
                        }}
                        type="button"
                      >
                        <Plus aria-hidden="true" /> Hinzufügen
                      </button>
                    </article>
                  );
                })
              ) : (
                <EmptyState
                  action={
                    <button
                      className={`${ui.button} ${ui.primary}`}
                      onClick={() => addNewQuestion()}
                      type="button"
                    >
                      <Plus aria-hidden="true" /> Frage selbst erstellen
                    </button>
                  }
                  icon={Search}
                  text="Für diesen Filter gibt es noch keine unbenutzten Fragen."
                  title="Keine passende Frage gefunden"
                />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
