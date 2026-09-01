"use client";

import { Download, FileText } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import styles from "./page.module.css";

type ExportFormat = "docx" | "pdf" | "csv" | "json";

const options: {
  id: ExportFormat;
  label: string;
  title: string;
  description: string;
}[] = [
  {
    id: "docx",
    label: "DOCX",
    title: "Word-Dokument · für Forms",
    description:
      "Vertikal formatierte Fragen und Antworten für den Schnellimport in Microsoft Forms.",
  },
  {
    id: "pdf",
    label: "PDF",
    title: "PDF · für Forms",
    description:
      "Unveränderliche Alternative für den Schnellimport und die Freigabe.",
  },
  {
    id: "csv",
    label: "CSV",
    title: "Excel-kompatible Prüfliste",
    description:
      "Eine Zeile pro Frage mit Typ, Antworten, Lösung und Punkten.",
  },
  {
    id: "json",
    label: "JSON",
    title: "AlphaQuiz-Sicherung",
    description:
      "Vollständige Quizdaten, die später wieder importiert werden können.",
  },
];

function ExportContent() {
  const searchParams = useSearchParams();
  const {
    state,
    recordExport,
    showToast,
  } = useQuizApp();
  const requestedQuiz = searchParams.get("quiz");
  const [quizId, setQuizId] = useState(
    requestedQuiz ?? state.quizzes[0]?.id ?? "",
  );
  const [format, setFormat] = useState<ExportFormat>("docx");
  const [loading, setLoading] = useState(false);
  const quiz = state.quizzes.find((item) => item.id === quizId);
  const questions = useMemo(
    () =>
      quiz?.questionIds
        .map((id) => state.questions.find((question) => question.id === id))
        .filter((question) => question !== undefined) ?? [],
    [quiz, state.questions],
  );
  const selected = options.find((option) => option.id === format)!;

  async function download() {
    if (!quiz) return;
    setLoading(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz, questions, format }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Export fehlgeschlagen.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileName =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        `alphaquiz-export.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      recordExport({ quizId: quiz.id, format: selected.label, fileName });
      showToast(`${selected.label}-Datei wurde heruntergeladen.`);
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Export fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!state.quizzes.length) {
    return (
      <EmptyState
        icon={FileText}
        text="Erstelle zuerst ein Quiz und füge mindestens eine Frage hinzu."
        title="Nichts zu exportieren"
      />
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <button
            className={`${ui.button} ${ui.primary}`}
            disabled={loading || !questions.length}
            onClick={() => void download()}
            type="button"
          >
            <Download aria-hidden="true" />
            {loading ? "Datei wird erzeugt …" : "Datei erzeugen"}
          </button>
        }
        eyebrow="Export"
        lead="Format wählen, Datei laden, in Microsoft Forms hochladen."
        title="Herunterladen."
      />

      <label className={`${ui.field} ${styles.quizSelect}`}>
        <span>Quiz auswählen</span>
        <select
          className={ui.input}
          onChange={(event) => setQuizId(event.target.value)}
          value={quizId}
        >
          {state.quizzes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} · {item.questionIds.length} Fragen
            </option>
          ))}
        </select>
      </label>

      <section className={styles.layout}>
        <article className={`${ui.card} ${styles.options}`}>
          {options.map((option) => (
            <button
              aria-pressed={format === option.id}
              className={styles.option}
              data-active={format === option.id}
              key={option.id}
              onClick={() => setFormat(option.id)}
              type="button"
            >
              <span>{option.label}</span>
              <span>
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          ))}
        </article>

        <div className={styles.notice}>
          <strong>{selected.label} ausgewählt.</strong> {questions.length} Fragen
          aus „{quiz?.title}“. DOCX und PDF sind für den
          Forms-Schnellimport optimiert. Komplexe Formate wie Zuordnung und
          Reihenfolge können in Forms Nacharbeit benötigen. Fragebilder sind
          eingebettet; da Forms Abbildungen beim Schnellimport auslassen kann,
          müssen sie in der Importprüfung kontrolliert und gegebenenfalls
          manuell ergänzt werden.
        </div>
      </section>
    </>
  );
}

export default function ExportPage() {
  return (
    <Suspense fallback={<p>Export wird geladen …</p>}>
      <ExportContent />
    </Suspense>
  );
}
