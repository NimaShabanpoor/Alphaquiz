import { Plus, Search, Tags, X } from "lucide-react";
import Image from "next/image";
import { EmptyState, ui } from "@/components/ui";
import type { Question, Quiz, Topic } from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

type QuestionPoolDialogProps = {
  quiz: Quiz;
  questions: Question[];
  allTopics: Topic[];
  visibleTopics: Topic[];
  query: string;
  selectedTopicId: string;
  targetTopicId: string;
  onAdd: (question: Question) => void;
  onClose: () => void;
  onCreate: () => void;
  onQueryChange: (value: string) => void;
  onSelectedTopicChange: (value: string) => void;
  onTargetTopicChange: (value: string) => void;
};

export function QuestionPoolDialog({
  quiz,
  questions,
  allTopics,
  visibleTopics,
  query,
  selectedTopicId,
  targetTopicId,
  onAdd,
  onClose,
  onCreate,
  onQueryChange,
  onSelectedTopicChange,
  onTargetTopicChange,
}: QuestionPoolDialogProps) {
  return (
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
            aria-label="Fragenpool schliessen"
            className={`${ui.button} ${ui.quiet}`}
            onClick={onClose}
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
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Frage suchen …"
              value={query}
            />
          </label>
          <select
            aria-label="Unterthema auswählen"
            className={ui.input}
            onChange={(event) => onSelectedTopicChange(event.target.value)}
            value={selectedTopicId}
          >
            <option value="all">Alle Unterthemen</option>
            {allTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <button
            className={`${ui.button} ${ui.primary}`}
            onClick={onCreate}
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
            onChange={(event) => onTargetTopicChange(event.target.value)}
            value={targetTopicId}
          >
            <option value="">Bisheriges Unterthema behalten</option>
            {visibleTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.poolList}>
          {questions.length ? (
            questions.map((question) => {
              const topic = allTopics.find(
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
                    onClick={() => onAdd(question)}
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
                  onClick={onCreate}
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
  );
}
