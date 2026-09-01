"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import { ui } from "@/components/ui";
import {
  examTopicId,
  topicLabel,
  validateExamRandomization,
} from "@/lib/exam-randomization";
import type {
  ExamQuestionOrderMode,
  ExamRandomizationConfig,
  ExamPublication,
  Question,
  Quiz,
  Topic,
} from "@/lib/quiz-types";
import styles from "./page.module.css";

type ExamRandomizationPanelProps = {
  onToggle: () => void;
  onUpdate: (patch: Partial<ExamPublication>) => void;
  open: boolean;
  publication: ExamPublication;
  questions: Question[];
  quiz: Quiz;
  topics: Topic[];
};

export default function ExamRandomizationPanel({
  onToggle,
  onUpdate,
  open: randomizationOpen,
  publication,
  questions,
  quiz,
  topics,
}: ExamRandomizationPanelProps) {
  const topicGroups = new Map<string, Question[]>();
  for (const question of questions) {
    const topicId = examTopicId(
      question,
      quiz,
      publication.randomization.useTopics,
    );
    topicGroups.set(topicId, [
      ...(topicGroups.get(topicId) ?? []),
      question,
    ]);
  }
  const randomizationErrors = validateExamRandomization(
    quiz,
    questions,
    topics,
    publication.randomization,
  );

  function updateRandomization(
    _publicationId: string,
    current: ExamRandomizationConfig,
    patch: Partial<ExamRandomizationConfig>,
  ) {
    onUpdate({ randomization: { ...current, ...patch } });
  }

  return (
                  <section className={styles.randomization}>
                    <button
                      aria-expanded={randomizationOpen}
                      className={styles.randomizationToggle}
                      onClick={onToggle}
                      type="button"
                    >
                      <Settings2 aria-hidden="true" />
                      <span>
                        <strong>Zufallslogik</strong>
                        <small>
                          {
                            {
                              fixed: "Feste Reihenfolge",
                              "shuffle-all": "Alle Fragen mischen",
                              "shuffle-within-topics":
                                "Innerhalb der Unterkategorien mischen",
                              "shuffle-topics-and-questions":
                                "Unterkategorien und Fragen mischen",
                            }[publication.randomization.questionOrderMode]
                          }
                          {" · "}
                          {publication.randomization.shuffleAnswers
                            ? "Antworten mischen"
                            : "Antworten fest"}
                        </small>
                      </span>
                      {randomizationErrors.length ? (
                        <span className={styles.errorCount}>
                          {randomizationErrors.length} Fehler
                        </span>
                      ) : (
                        <span className={styles.validConfig}>Gültig</span>
                      )}
                      <ChevronDown aria-hidden="true" />
                    </button>

                    {randomizationOpen ? (
                      <div className={styles.randomizationBody}>
                        <div className={styles.randomizationFields}>
                          <label className={ui.field}>
                            <span>Fragenreihenfolge</span>
                            <select
                              className={ui.input}
                              onChange={(event) =>
                                updateRandomization(
                                  publication.id,
                                  publication.randomization,
                                  {
                                    questionOrderMode: event.target
                                      .value as ExamQuestionOrderMode,
                                  },
                                )
                              }
                              value={
                                publication.randomization.questionOrderMode
                              }
                            >
                              <option value="fixed">Feste Reihenfolge</option>
                              <option value="shuffle-all">
                                Alle Fragen mischen
                              </option>
                              {publication.randomization.useTopics ? (
                                <>
                                  <option value="shuffle-within-topics">
                                    Innerhalb der Unterkategorien mischen
                                  </option>
                                  <option value="shuffle-topics-and-questions">
                                    Unterkategorien und Fragen mischen
                                  </option>
                                </>
                              ) : null}
                            </select>
                          </label>
                          <label className={styles.optionToggle}>
                            <input
                              checked={publication.randomization.useTopics}
                              onChange={(event) =>
                                updateRandomization(
                                  publication.id,
                                  publication.randomization,
                                  {
                                    useTopics: event.target.checked,
                                    questionOrderMode:
                                      !event.target.checked &&
                                      (publication.randomization
                                        .questionOrderMode ===
                                        "shuffle-within-topics" ||
                                        publication.randomization
                                          .questionOrderMode ===
                                          "shuffle-topics-and-questions")
                                        ? "shuffle-all"
                                        : publication.randomization
                                            .questionOrderMode,
                                  },
                                )
                              }
                              type="checkbox"
                            />
                            <span>
                              <strong>Unterkategorien verwenden</strong>
                              <small>
                                Deaktiviert: alle Fragen bilden einen gemeinsamen
                                Pool.
                              </small>
                            </span>
                          </label>
                          <label className={styles.optionToggle}>
                            <input
                              checked={publication.randomization.shuffleAnswers}
                              onChange={(event) =>
                                updateRandomization(
                                  publication.id,
                                  publication.randomization,
                                  { shuffleAnswers: event.target.checked },
                                )
                              }
                              type="checkbox"
                            />
                            <span>
                              <strong>Antwortoptionen mischen</strong>
                              <small>
                                Nur bei Fragen, bei denen Mischen erlaubt ist.
                              </small>
                            </span>
                          </label>
                          <label className={ui.field}>
                            <span>Neuer Versuch</span>
                            <select
                              className={ui.input}
                              onChange={(event) =>
                                updateRandomization(
                                  publication.id,
                                  publication.randomization,
                                  {
                                    retryMode: event.target.value as
                                      | "reuse"
                                      | "regenerate",
                                  },
                                )
                              }
                              value={publication.randomization.retryMode}
                            >
                              <option value="reuse">
                                Gleiche Auswahl wiederverwenden
                              </option>
                              <option value="regenerate">
                                Neue Auswahl erzeugen
                              </option>
                            </select>
                          </label>
                        </div>

                        <div className={styles.selectionConfig}>
                          <div>
                            <strong>Fragenauswahl</strong>
                            <small>
                              Verpflichtende Fragen zählen zur eingestellten
                              Anzahl.
                            </small>
                          </div>
                          <div className={styles.topicCounts}>
                            {Array.from(topicGroups).map(
                              ([topicId, topicQuestions]) => {
                                const field = `questionCountByTopic.${topicId}`;
                                const fieldError = randomizationErrors.find(
                                  (error) => error.field === field,
                                );
                                return (
                                  <label
                                    className={styles.topicCount}
                                    key={topicId}
                                  >
                                    <span>
                                      {topicLabel(topicId, topics)}
                                    </span>
                                    <input
                                      aria-invalid={Boolean(fieldError)}
                                      max={topicQuestions.length}
                                      min="0"
                                      onChange={(event) =>
                                        updateRandomization(
                                          publication.id,
                                          publication.randomization,
                                          {
                                            questionCountByTopic: {
                                              ...publication.randomization
                                                .questionCountByTopic,
                                              [topicId]: Number(
                                                event.target.value,
                                              ),
                                            },
                                          },
                                        )
                                      }
                                      type="number"
                                      value={
                                        publication.randomization
                                          .questionCountByTopic[topicId] ??
                                        topicQuestions.length
                                      }
                                    />
                                    <small>von {topicQuestions.length}</small>
                                    {fieldError ? (
                                      <em>{fieldError.message}</em>
                                    ) : null}
                                  </label>
                                );
                              },
                            )}
                          </div>
                        </div>

                        <div className={styles.questionRules}>
                          <div>
                            <strong>Fragenregeln</strong>
                            <small>
                              Fixierte Fragen bleiben an ihrem Platz in der
                              ausgewählten Grundliste.
                            </small>
                          </div>
                          <div className={styles.ruleRows}>
                            {questions.map((question, index) => (
                              <div key={question.id}>
                                <span>
                                  <small>Frage {index + 1}</small>
                                  <strong>{question.title}</strong>
                                </span>
                                <label>
                                  <input
                                    checked={publication.randomization.requiredQuestionIds.includes(
                                      question.id,
                                    )}
                                    onChange={(event) =>
                                      updateRandomization(
                                        publication.id,
                                        publication.randomization,
                                        {
                                          requiredQuestionIds: event.target.checked
                                            ? [
                                                ...publication.randomization
                                                  .requiredQuestionIds,
                                                question.id,
                                              ]
                                            : publication.randomization.requiredQuestionIds.filter(
                                                (id) => id !== question.id,
                                              ),
                                        },
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  Immer enthalten
                                </label>
                                <label>
                                  <input
                                    checked={publication.randomization.lockedQuestionIds.includes(
                                      question.id,
                                    )}
                                    onChange={(event) =>
                                      updateRandomization(
                                        publication.id,
                                        publication.randomization,
                                        {
                                          lockedQuestionIds: event.target.checked
                                            ? [
                                                ...publication.randomization
                                                  .lockedQuestionIds,
                                                question.id,
                                              ]
                                            : publication.randomization.lockedQuestionIds.filter(
                                                (id) => id !== question.id,
                                              ),
                                        },
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  Position fixieren
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {randomizationErrors.length ? (
                          <div className={styles.configErrors} role="alert">
                            {randomizationErrors.map((error) => (
                              <p key={`${error.field}-${error.message}`}>
                                {error.message}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
  );
}
