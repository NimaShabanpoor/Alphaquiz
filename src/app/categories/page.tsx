"use client";

import { FolderPlus, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import styles from "./page.module.css";

function categorySymbol(name: string) {
  const normalized = name.trim().toLocaleLowerCase("de-CH");
  if (normalized.includes("excel")) return "X";
  if (normalized.includes("word")) return "W";
  if (normalized.includes("outlook")) return "O";
  if (normalized.includes("teams")) return "T";
  if (normalized.includes("powerpoint")) return "P";
  if (normalized.includes("access")) return "A";
  if (normalized.includes("onenote")) return "N";
  if (normalized.includes("sharepoint")) return "S";
  return name.trim().slice(0, 1).toLocaleUpperCase("de-CH") || "•";
}

export default function CategoriesPage() {
  const {
    state,
    createCategory,
    updateCategory,
    deleteCategory,
    createTopic,
    updateTopic,
    deleteTopic,
    showToast,
  } = useQuizApp();
  const [name, setName] = useState("");
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});

  function addCategory() {
    const clean = name.trim();
    if (!clean) return;
    if (
      state.categories.some(
        (category) => category.name.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      showToast("Diese Kategorie existiert bereits.");
      return;
    }
    createCategory(clean);
    setName("");
    showToast("Kategorie mit dem Thema „Allgemein“ wurde angelegt.");
  }

  function addTopic(categoryId: string) {
    const clean = (topicNames[categoryId] ?? "").trim();
    if (!clean) return;
    if (
      state.topics.some(
        (topic) =>
          topic.categoryId === categoryId &&
          topic.name.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      showToast("Dieses Thema existiert bereits.");
      return;
    }
    createTopic(categoryId, clean);
    setTopicNames((current) => ({ ...current, [categoryId]: "" }));
    showToast("Unterthema wurde angelegt.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Kategorien & Unterthemen"
        lead="Produkte wie Excel enthalten Unterthemen. Fragen und Prüfungsergebnisse lassen sich dadurch getrennt auswerten."
        title="Themen ordnen."
      />

      <form
        className={`${ui.card} ${styles.create}`}
        onSubmit={(event) => {
          event.preventDefault();
          addCategory();
        }}
      >
        <label className={ui.field}>
          <span>Neue Kategorie</span>
          <input
            className={ui.input}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. PowerPoint"
            value={name}
          />
        </label>
        <button
          className={`${ui.button} ${ui.primary}`}
          disabled={!name.trim()}
          type="submit"
        >
          <Plus aria-hidden="true" /> Kategorie anlegen
        </button>
      </form>

      <section className={styles.categoryList}>
        {state.categories.length ? (
          state.categories.map((category) => {
            const categoryTopics = state.topics.filter(
              (topic) => topic.categoryId === category.id,
            );
            const questionCount = state.questions.filter(
              (question) => question.categoryId === category.id,
            ).length;
            const quizCount = state.quizzes.filter(
              (quiz) => quiz.categoryId === category.id,
            ).length;
            const used = questionCount > 0 || quizCount > 0;

            return (
              <article className={`${ui.card} ${styles.category}`} key={category.id}>
                <header className={styles.categoryHead}>
                  <label
                    className={styles.productIcon}
                    style={{ backgroundColor: category.color }}
                    title={`Farbe für ${category.name} ändern`}
                  >
                    <span aria-hidden="true">{categorySymbol(category.name)}</span>
                    <input
                      aria-label={`Farbe für ${category.name}`}
                      className={styles.color}
                      onChange={(event) =>
                        updateCategory(category.id, {
                          color: event.target.value,
                        })
                      }
                      type="color"
                      value={category.color}
                    />
                  </label>
                  <div className={styles.categoryName}>
                    <input
                      aria-label="Kategoriename"
                      onChange={(event) =>
                        updateCategory(category.id, {
                          name: event.target.value,
                        })
                      }
                      value={category.name}
                    />
                    <small>
                      {categoryTopics.length} Unterthemen · {questionCount} Fragen ·{" "}
                      {quizCount} Quizzes
                    </small>
                  </div>
                  <button
                    aria-label={`${category.name} löschen`}
                    className={`${ui.button} ${ui.quiet} ${ui.danger}`}
                    onClick={() => {
                      if (used) {
                        showToast(
                          "Die Kategorie wird noch verwendet und kann nicht gelöscht werden.",
                        );
                        return;
                      }
                      deleteCategory(category.id);
                      showToast("Kategorie wurde gelöscht.");
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </header>

                <div className={styles.topics}>
                  {categoryTopics.map((topic) => {
                    const topicQuestions = state.questions.filter(
                      (question) => question.topicId === topic.id,
                    ).length;
                    return (
                      <div className={styles.topicRow} key={topic.id}>
                        <Tags aria-hidden="true" />
                        <input
                          aria-label="Unterthema"
                          onChange={(event) =>
                            updateTopic(topic.id, { name: event.target.value })
                          }
                          value={topic.name}
                        />
                        <span>{topicQuestions} Fragen</span>
                        <button
                          aria-label={`${topic.name} löschen`}
                          className={`${ui.button} ${ui.quiet} ${ui.danger}`}
                          onClick={() => {
                            if (categoryTopics.length === 1) {
                              showToast(
                                "Eine Kategorie benötigt mindestens ein Unterthema.",
                              );
                              return;
                            }
                            if (topicQuestions) {
                              showToast(
                                "Das Thema enthält noch Fragen und kann nicht gelöscht werden.",
                              );
                              return;
                            }
                            deleteTopic(topic.id);
                            showToast("Unterthema wurde gelöscht.");
                          }}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}

                  <form
                    className={styles.addTopic}
                    onSubmit={(event) => {
                      event.preventDefault();
                      addTopic(category.id);
                    }}
                  >
                    <input
                      aria-label={`Neues Unterthema für ${category.name}`}
                      className={ui.input}
                      onChange={(event) =>
                        setTopicNames((current) => ({
                          ...current,
                          [category.id]: event.target.value,
                        }))
                      }
                      placeholder="Neues Unterthema, z. B. Diagramme"
                      value={topicNames[category.id] ?? ""}
                    />
                    <button
                      className={ui.button}
                      disabled={!(topicNames[category.id] ?? "").trim()}
                      type="submit"
                    >
                      <Plus aria-hidden="true" /> Thema hinzufügen
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        ) : (
          <div className={ui.card}>
            <EmptyState
              icon={FolderPlus}
              text="Lege eine Kategorie an, bevor du Quizzes erstellst."
              title="Noch keine Kategorien"
            />
          </div>
        )}
      </section>
    </>
  );
}
