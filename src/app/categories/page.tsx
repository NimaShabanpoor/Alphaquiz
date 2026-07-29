"use client";

import { FolderPlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import styles from "./page.module.css";

export default function CategoriesPage() {
  const {
    state,
    createCategory,
    updateCategory,
    deleteCategory,
    showToast,
  } = useQuizApp();
  const [name, setName] = useState("");

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
    showToast("Kategorie wurde angelegt.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Kategorien"
        lead="Kategorien ordnen Quizzes und Fragen. Sie entsprechen den Produkten aus der Access-Datenbank."
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
          <Plus aria-hidden="true" /> Anlegen
        </button>
      </form>

      <section className={`${ui.card} ${styles.list}`}>
        {state.categories.length ? (
          state.categories.map((category) => {
            const questionCount = state.questions.filter(
              (question) => question.categoryId === category.id,
            ).length;
            const quizCount = state.quizzes.filter(
              (quiz) => quiz.categoryId === category.id,
            ).length;
            const used = questionCount > 0 || quizCount > 0;
            return (
              <article className={styles.row} key={category.id}>
                <input
                  aria-label={`Farbe für ${category.name}`}
                  className={styles.color}
                  onChange={(event) =>
                    updateCategory(category.id, { color: event.target.value })
                  }
                  type="color"
                  value={category.color}
                />
                <input
                  aria-label="Kategoriename"
                  className={styles.name}
                  onChange={(event) =>
                    updateCategory(category.id, { name: event.target.value })
                  }
                  value={category.name}
                />
                <span>
                  {questionCount} Fragen · {quizCount} Quizzes
                </span>
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
              </article>
            );
          })
        ) : (
          <EmptyState
            icon={FolderPlus}
            text="Lege eine Kategorie an, bevor du Quizzes erstellst."
            title="Noch keine Kategorien"
          />
        )}
      </section>
    </>
  );
}
