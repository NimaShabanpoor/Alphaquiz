"use client";

import {
  BookOpen,
  CalendarClock,
  Clock3,
  Copy,
  ChevronDown,
  ExternalLink,
  Mail,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import {
  examTopicId,
  topicLabel,
  validateExamRandomization,
} from "@/lib/exam-randomization";
import type {
  ExamMode,
  ExamQuestionOrderMode,
  ExamRandomizationConfig,
  Question,
} from "@/lib/quiz-types";
import styles from "./page.module.css";

function toDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDate(value: string) {
  return value ? new Date(value).toISOString() : "";
}

export default function ExamsPage() {
  const {
    state,
    createExamPublication,
    updateExamPublication,
    deleteExamPublication,
    showToast,
  } = useQuizApp();
  const [quizId, setQuizId] = useState(state.quizzes[0]?.id ?? "");
  const [deleteId, setDeleteId] = useState("");
  const [randomizationId, setRandomizationId] = useState("");

  function updateRandomization(
    publicationId: string,
    current: ExamRandomizationConfig,
    patch: Partial<ExamRandomizationConfig>,
  ) {
    updateExamPublication(publicationId, {
      randomization: { ...current, ...patch },
    });
  }

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
            const questions =
              quiz?.questionIds
                .map((id) =>
                  state.questions.find((question) => question.id === id),
                )
                .filter((question): question is Question => Boolean(question)) ??
              [];
            const topicGroups = new Map<string, Question[]>();
            for (const question of questions) {
              const topicId = quiz
                ? examTopicId(
                    question,
                    quiz,
                    publication.randomization.useTopics,
                  )
                : "";
              topicGroups.set(topicId, [
                ...(topicGroups.get(topicId) ?? []),
                question,
              ]);
            }
            const randomizationErrors = quiz
              ? validateExamRandomization(
                  quiz,
                  questions,
                  state.topics,
                  publication.randomization,
                )
              : [];
            const randomizationOpen = randomizationId === publication.id;
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
                  <div className={styles.headerActions}>
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
                    <button
                      aria-label={`Prüfung ${quiz?.title ?? ""} löschen`}
                      className={styles.deleteButton}
                      onClick={() => setDeleteId(publication.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
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
                  <label className={ui.field}>
                    <span>Freigabe ab</span>
                    <div className={styles.dateInput}>
                      <CalendarClock aria-hidden="true" />
                      <input
                        className={ui.input}
                        onChange={(event) =>
                          updateExamPublication(publication.id, {
                            availableFrom: toIsoDate(event.target.value),
                          })
                        }
                        type="datetime-local"
                        value={toDateTimeInput(publication.availableFrom)}
                      />
                    </div>
                  </label>
                  <label className={ui.field}>
                    <span>Freigabe bis</span>
                    <div className={styles.dateInput}>
                      <CalendarClock aria-hidden="true" />
                      <input
                        className={ui.input}
                        min={toDateTimeInput(publication.availableFrom)}
                        onChange={(event) =>
                          updateExamPublication(publication.id, {
                            availableUntil: toIsoDate(event.target.value),
                          })
                        }
                        type="datetime-local"
                        value={toDateTimeInput(publication.availableUntil)}
                      />
                    </div>
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

                <section className={styles.randomization}>
                  <button
                    aria-expanded={randomizationOpen}
                    className={styles.randomizationToggle}
                    onClick={() =>
                      setRandomizationId((current) =>
                        current === publication.id ? "" : publication.id,
                      )
                    }
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
                                    {topicLabel(topicId, state.topics)}
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
                {deleteId === publication.id ? (
                  <div className={styles.deleteConfirm} role="alert">
                    <span>
                      <strong>Prüfung wirklich löschen?</strong>
                      <small>
                        Der Link, {attempts.length} Versuche und alle
                        zugehörigen Resultate und Meldungen werden gelöscht.
                      </small>
                    </span>
                    <button
                      className={ui.button}
                      onClick={() => setDeleteId("")}
                      type="button"
                    >
                      Abbrechen
                    </button>
                    <button
                      className={`${ui.button} ${ui.danger}`}
                      onClick={() => {
                        deleteExamPublication(publication.id);
                        void fetch(
                          `/api/supabase?publicationId=${encodeURIComponent(publication.id)}`,
                          { method: "DELETE" },
                        ).catch(() => undefined);
                        setDeleteId("");
                        showToast("Prüfung und zugehörige Resultate wurden gelöscht.");
                      }}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" /> Endgültig löschen
                    </button>
                  </div>
                ) : null}
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
