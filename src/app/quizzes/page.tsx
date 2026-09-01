"use client";

import { FileQuestion, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import { statusLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

export default function QuizzesPage() {
  const { state, createQuiz, deleteQuiz, showToast } = useQuizApp();
  const router = useRouter();

  function startQuiz() {
    router.push(`/quizzes/${createQuiz()}`);
  }

  return (
    <>
      <PageHeader
        actions={
          <button
            className={`${ui.button} ${ui.primary}`}
            onClick={startQuiz}
            type="button"
          >
            <Plus aria-hidden="true" />
            Quiz erstellen
          </button>
        }
        eyebrow="Quizzes"
        lead="Erstelle Quizsammlungen, füge Fragen hinzu und bereite sie für Microsoft Forms vor."
        title="Alle Quizzes."
      />

      <section className={`${ui.card} ${styles.list}`}>
        {state.quizzes.length ? (
          state.quizzes.map((quiz) => {
            const category = state.categories.find(
              (item) => item.id === quiz.categoryId,
            );
            return (
              <article className={styles.row} key={quiz.id}>
                <Link className={styles.main} href={`/quizzes/${quiz.id}`}>
                  <span
                    className={styles.mark}
                    style={{ background: category?.color }}
                  >
                    {quiz.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{quiz.title}</strong>
                    <small>
                      {quiz.questionIds.length} Fragen ·{" "}
                      {category?.name ?? "Ohne Kategorie"} ·{" "}
                      {quiz.scoringMode === "per-topic"
                        ? "jedes Thema bestehen"
                        : `gesamt ab ${quiz.passPercentage} %`}{" "}
                      · zuletzt{" "}
                      {new Date(quiz.updatedAt).toLocaleDateString("de-CH")}
                    </small>
                  </span>
                </Link>
                <span className={ui.pill} data-tone={quiz.status}>
                  {statusLabels[quiz.status]}
                </span>
                <button
                  aria-label={`${quiz.title} löschen`}
                  className={`${ui.button} ${ui.quiet} ${ui.danger}`}
                  onClick={() => {
                    deleteQuiz(quiz.id);
                    showToast("Quiz wurde gelöscht.");
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
            action={
              <button
                className={`${ui.button} ${ui.primary}`}
                onClick={startQuiz}
                type="button"
              >
                Erstes Quiz erstellen
              </button>
            }
            icon={FileQuestion}
            text="Ein Quiz bündelt Fragen und kann anschliessend als Word, PDF, CSV oder JSON exportiert werden."
            title="Noch kein Quiz"
          />
        )}
      </section>
    </>
  );
}
