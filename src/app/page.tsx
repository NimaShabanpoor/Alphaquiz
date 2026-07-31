"use client";

import {
  ArrowRight,
  CircleHelp,
  FileOutput,
  Folder,
  ListChecks,
  Plus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuizApp } from "@/components/app-provider";
import { PageHeader, ui } from "@/components/ui";
import { statusLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { state, createQuiz } = useQuizApp();
  const router = useRouter();
  const sortedQuizzes = [...state.quizzes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const recentExports = state.exports.slice(0, 3);

  function startQuiz() {
    router.push(`/quizzes/${createQuiz()}`);
  }

  const stats = [
    { label: "Quizzes", value: state.quizzes.length, icon: ListChecks },
    { label: "Fragen im Pool", value: state.questions.length, icon: CircleHelp },
    { label: "Kategorien", value: state.categories.length, icon: Folder },
    { label: "Exporte", value: state.exports.length, icon: FileOutput },
  ];

  return (
    <>
      <PageHeader
        actions={
          <>
            <Link className={ui.button} href="/import">
              <Upload aria-hidden="true" />
              Datei importieren
            </Link>
            <button
              className={`${ui.button} ${ui.primary}`}
              onClick={startQuiz}
              type="button"
            >
              <Plus aria-hidden="true" />
              Quiz erstellen
            </button>
          </>
        }
        eyebrow="Übersicht"
        lead="Deine Quizzes, Fragen und Exporte auf einen Blick."
        title="Guten Tag Werner Hutter."
      />

      <section aria-label="Kennzahlen" className={styles.stats}>
        {stats.map(({ icon: Icon, label, value }) => (
          <article className={`${ui.card} ${styles.stat}`} key={label}>
            <span className={styles.statIcon}>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.grid}>
        <article className={`${ui.card} ${styles.panel}`}>
          <div className={styles.panelHead}>
            <div>
              <p>Zuletzt bearbeitet</p>
              <h2>Quizzes</h2>
            </div>
            <Link className={`${ui.button} ${ui.quiet}`} href="/quizzes">
              Alle anzeigen <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {sortedQuizzes.map((quiz) => {
            const category = state.categories.find(
              (item) => item.id === quiz.categoryId,
            );
            return (
              <Link
                className={styles.row}
                href={`/quizzes/${quiz.id}`}
                key={quiz.id}
              >
                <span>
                  <strong>{quiz.title}</strong>
                  <small>
                    {quiz.questionIds.length} Fragen ·{" "}
                    {category?.name ?? "Ohne Kategorie"}
                  </small>
                </span>
                <span className={ui.pill} data-tone={quiz.status}>
                  {statusLabels[quiz.status]}
                </span>
              </Link>
            );
          })}
        </article>

        <article className={`${ui.card} ${styles.panel}`}>
          <div className={styles.panelHead}>
            <div>
              <p>Neu erzeugt</p>
              <h2>Exporte</h2>
            </div>
            <Link className={`${ui.button} ${ui.quiet}`} href="/export">
              Exportieren <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {recentExports.length ? (
            recentExports.map((record) => (
              <div className={styles.row} key={record.id}>
                <span className={styles.fileType}>{record.format}</span>
                <span>
                  <strong>{record.fileName}</strong>
                  <small>
                    {new Date(record.createdAt).toLocaleString("de-CH")}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <p className={styles.muted}>
              Noch keine Dateien erzeugt. Öffne einen Quiz-Export, um zu
              beginnen.
            </p>
          )}
        </article>
      </section>
    </>
  );
}
