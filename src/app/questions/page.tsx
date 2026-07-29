"use client";

import { Check, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import type { QuestionType } from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

export default function QuestionsPage() {
  const {
    state,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    showToast,
  } = useQuizApp();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const selected = state.questions.find((question) => question.id === selectedId);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.questions.filter(
      (question) =>
        (categoryId === "all" || question.categoryId === categoryId) &&
        (!needle ||
          question.title.toLowerCase().includes(needle) ||
          question.description.toLowerCase().includes(needle)),
    );
  }, [categoryId, query, state.questions]);

  function startQuestion() {
    setSelectedId(
      createQuestion(categoryId === "all" ? undefined : categoryId),
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <button
            className={`${ui.button} ${ui.primary}`}
            onClick={startQuestion}
            type="button"
          >
            <Plus aria-hidden="true" /> Frage erfassen
          </button>
        }
        eyebrow="Fragenpool"
        lead="Eine zentrale Sammlung – dieselbe Frage kann in mehreren Quizzes verwendet werden."
        title="Alle Fragen."
      />

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <input
            aria-label="Fragen durchsuchen"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Frage suchen …"
            value={query}
          />
        </label>
        <select
          aria-label="Kategorie filtern"
          className={ui.input}
          onChange={(event) => setCategoryId(event.target.value)}
          value={categoryId}
        >
          <option value="all">Alle Kategorien</option>
          {state.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <section className={`${ui.card} ${styles.list}`}>
        {filtered.length ? (
          filtered.map((question) => {
            const category = state.categories.find(
              (item) => item.id === question.categoryId,
            );
            return (
              <button
                className={styles.row}
                key={question.id}
                onClick={() => setSelectedId(question.id)}
                type="button"
              >
                <span
                  className={styles.mark}
                  style={{ background: category?.color }}
                >
                  {category?.name.slice(0, 1) ?? "?"}
                </span>
                <span className={styles.copy}>
                  <strong>{question.title}</strong>
                  <small>
                    {questionTypeLabels[question.type]} ·{" "}
                    {question.answers.length} Antworten · {question.points}{" "}
                    Punkte
                  </small>
                </span>
                <span className={ui.pill}>
                  {category?.name ?? "Ohne Kategorie"}
                </span>
              </button>
            );
          })
        ) : (
          <EmptyState
            action={
              <button className={ui.button} onClick={startQuestion} type="button">
                Neue Frage
              </button>
            }
            icon={Search}
            text="Passe den Suchbegriff oder den Kategoriefilter an."
            title="Keine Fragen gefunden"
          />
        )}
      </section>

      {selected ? (
        <div className={styles.modalBackdrop}>
          <section
            aria-labelledby="question-dialog-title"
            aria-modal="true"
            className={`${ui.card} ${styles.modal}`}
            role="dialog"
          >
            <div className={styles.modalHead}>
              <div>
                <small>Frage bearbeiten</small>
                <h2 id="question-dialog-title">{selected.title}</h2>
              </div>
              <button
                aria-label="Dialog schließen"
                className={`${ui.button} ${ui.quiet}`}
                onClick={() => setSelectedId("")}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.form}>
              <label className={ui.field}>
                <span>Fragetext</span>
                <input
                  className={ui.input}
                  onChange={(event) =>
                    updateQuestion(selected.id, { title: event.target.value })
                  }
                  value={selected.title}
                />
              </label>
              <div className={styles.formRow}>
                <label className={ui.field}>
                  <span>Format</span>
                  <select
                    className={ui.input}
                    onChange={(event) =>
                      updateQuestion(selected.id, {
                        type: event.target.value as QuestionType,
                      })
                    }
                    value={selected.type}
                  >
                    {(Object.keys(questionTypeLabels) as QuestionType[]).map(
                      (type) => (
                        <option key={type} value={type}>
                          {questionTypeLabels[type]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className={ui.field}>
                  <span>Kategorie</span>
                  <select
                    className={ui.input}
                    onChange={(event) =>
                      updateQuestion(selected.id, {
                        categoryId: event.target.value,
                      })
                    }
                    value={selected.categoryId}
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
                      updateQuestion(selected.id, {
                        points: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={selected.points}
                  />
                </label>
              </div>
              <div className={styles.answers}>
                <strong>Antworten</strong>
                {selected.answers.map((answer) => (
                  <div className={styles.answer} key={answer.id}>
                    <button
                      aria-label="Richtige Antwort umschalten"
                      data-correct={answer.correct}
                      onClick={() =>
                        updateQuestion(selected.id, {
                          answers: selected.answers.map((item) => ({
                            ...item,
                            correct:
                              item.id === answer.id
                                ? !item.correct
                                : selected.type === "single"
                                  ? false
                                  : item.correct,
                          })),
                        })
                      }
                      type="button"
                    >
                      <Check aria-hidden="true" />
                    </button>
                    <input
                      onChange={(event) =>
                        updateQuestion(selected.id, {
                          answers: selected.answers.map((item) =>
                            item.id === answer.id
                              ? { ...item, text: event.target.value }
                              : item,
                          ),
                        })
                      }
                      value={answer.text}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={`${ui.button} ${ui.danger}`}
                onClick={() => {
                  deleteQuestion(selected.id);
                  setSelectedId("");
                  showToast("Frage wurde gelöscht.");
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" /> Löschen
              </button>
              <button
                className={`${ui.button} ${ui.primary}`}
                onClick={() => {
                  setSelectedId("");
                  showToast("Frage wurde gespeichert.");
                }}
                type="button"
              >
                Fertig
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
