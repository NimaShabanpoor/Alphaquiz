"use client";

import { Check, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { PageHeader, ui } from "@/components/ui";
import type { Category, Question } from "@/lib/quiz-types";
import styles from "./page.module.css";

type ImportResult = {
  fileName: string;
  questions: Question[];
  categories: Category[];
  details: {
    tables: string[];
    questionTable?: string;
    answerTable?: string;
    categoryTable?: string;
  };
};

export default function ImportPage() {
  const { importQuestions, showToast } = useQuizApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function readFile(file?: File) {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/import", { method: "POST", body });
      const data = (await response.json()) as ImportResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Import fehlgeschlagen.");
      setResult(data);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Import fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Import"
        lead="Access-Datenbanken, CSV- und JSON-Dateien werden im Next.js-Backend gelesen und in den Fragenpool übernommen."
        title="Fragen übernehmen."
      />

      <section
        className={styles.dropzone}
        data-dragging={dragging}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void readFile(event.dataTransfer.files[0]);
        }}
      >
        <span className={styles.dropIcon}>
          <Upload aria-hidden="true" />
        </span>
        <strong>{loading ? "Datei wird analysiert …" : "Datei hier ablegen"}</strong>
        <p>.accdb · .mdb · .csv · .json · maximal 25 MB</p>
        <button
          className={ui.button}
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" /> Datei auswählen
        </button>
        <input
          accept=".accdb,.mdb,.csv,.json"
          hidden
          onChange={(event) => void readFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {result ? (
        <section className={`${ui.card} ${styles.result}`}>
          <div className={styles.summary}>
            <div>
              <small>Analysiert</small>
              <h2>{result.fileName}</h2>
              <p>
                {result.details.tables.length} Tabellen ·{" "}
                {result.questions.length} Fragen · {result.categories.length}{" "}
                Kategorien
              </p>
            </div>
            <button
              className={`${ui.button} ${ui.primary}`}
              onClick={() => {
                const count = importQuestions(
                  result.questions,
                  result.categories,
                );
                showToast(`${count} Fragen wurden importiert.`);
                setResult(null);
              }}
              type="button"
            >
              <Check aria-hidden="true" /> {result.questions.length} Fragen
              importieren
            </button>
          </div>
          <div className={styles.mapping}>
            <div>
              <code>{result.details.questionTable ?? "questions"}</code>
              <span>→ Fragen</span>
            </div>
            {result.details.answerTable ? (
              <div>
                <code>{result.details.answerTable}</code>
                <span>→ Antworten</span>
              </div>
            ) : null}
            {result.details.categoryTable ? (
              <div>
                <code>{result.details.categoryTable}</code>
                <span>→ Kategorien</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
