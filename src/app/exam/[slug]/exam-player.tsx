import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import type {
  PublicExamAttempt,
  PublicExamQuestion,
} from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

type ExamPlayerProps = {
  attempt: PublicExamAttempt;
  question: PublicExamQuestion;
  error: string;
  saving: boolean;
  onChoose: (answerId: string) => void;
  onTextChange: (questionId: string, value: string) => void;
  onTextSave: (questionId: string, value: string) => void;
  onMove: (questionIndex: number) => void;
  onFinish: () => void;
};

export function ExamPlayer({
  attempt,
  question,
  error,
  saving,
  onChoose,
  onTextChange,
  onTextSave,
  onMove,
  onFinish,
}: ExamPlayerProps) {
  const questionCount = attempt.questions.length;
  const isLastQuestion = attempt.currentQuestion === questionCount - 1;

  return (
    <section className={styles.player}>
      <div className={styles.progressHead}>
        <span>
          Frage {attempt.currentQuestion + 1} von {questionCount}
        </span>
        <div>
          <span
            style={{
              width: `${((attempt.currentQuestion + 1) / questionCount) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className={styles.questionBody}>
        <p className={styles.eyebrow}>
          {question.topicLabel} · {questionTypeLabels[question.type]} ·{" "}
          {question.points} {question.points === 1 ? "Punkt" : "Punkte"}
        </p>
        <h1>{question.title}</h1>
        {question.image ? (
          <figure className={styles.questionImage}>
            <Image
              alt={question.image.alt || "Bild zur Frage"}
              height={520}
              priority
              src={question.image.dataUrl}
              unoptimized
              width={900}
            />
            {question.image.alt ? (
              <figcaption>{question.image.alt}</figcaption>
            ) : null}
          </figure>
        ) : null}
        <p className={styles.questionDescription}>
          {question.description ||
            (question.type === "multiple"
              ? "Mehrere Antworten können richtig sein."
              : "Wähle die passende Antwort.")}
        </p>
        {question.type === "text" ? (
          <textarea
            maxLength={10_000}
            onBlur={(event) => onTextSave(question.id, event.target.value)}
            onChange={(event) =>
              onTextChange(question.id, event.target.value)
            }
            placeholder="Antwort eingeben …"
            value={attempt.responses[question.id]?.[0] ?? ""}
          />
        ) : (
          <div className={styles.options}>
            {question.answers.map((answer, answerIndex) => {
              const selected = (
                attempt.responses[question.id] ?? []
              ).includes(answer.id);
              return (
                <button
                  aria-pressed={selected}
                  data-selected={selected}
                  key={answer.id}
                  onClick={() => onChoose(answer.id)}
                  type="button"
                >
                  <span>{String.fromCharCode(65 + answerIndex)}</span>
                  {answer.text}
                </button>
              );
            })}
          </div>
        )}
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <button
            disabled={attempt.currentQuestion === 0 || saving}
            onClick={() => onMove(attempt.currentQuestion - 1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" /> Zurück
          </button>
          <button
            className={styles.primaryAction}
            disabled={saving}
            onClick={() =>
              isLastQuestion
                ? onFinish()
                : onMove(attempt.currentQuestion + 1)
            }
            type="button"
          >
            {isLastQuestion
              ? saving
                ? "Wird abgegeben …"
                : "Prüfung abgeben"
              : "Weiter"}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
