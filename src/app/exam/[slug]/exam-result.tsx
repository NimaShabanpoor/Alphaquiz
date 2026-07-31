import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  XCircle,
} from "lucide-react";
import { ui } from "@/components/ui";
import type {
  PublicExamAttempt,
  PublicExamMetadata,
} from "@/lib/quiz-types";
import styles from "./page.module.css";

type ExamResultProps = {
  exam: PublicExamMetadata;
  attempt: PublicExamAttempt;
};

export function ExamResult({ exam, attempt }: ExamResultProps) {
  return (
    <section className={styles.result}>
      <span className={styles.resultIcon} data-passed={attempt.passed}>
        {attempt.passed ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <XCircle aria-hidden="true" />
        )}
      </span>
      <p className={styles.eyebrow}>
        {attempt.status === "terminated"
          ? "Prüfung beendet"
          : "Prüfung abgeschlossen"}
      </p>
      <h1>
        {attempt.score} von {attempt.possible} Punkten
      </h1>
      <p className={styles.resultLead}>
        {attempt.percentage} % ·{" "}
        <strong>{attempt.passed ? "Bestanden" : "Nicht bestanden"}</strong>
      </p>
      {attempt.status === "terminated" ? (
        <div className={styles.terminated}>
          <AlertTriangle aria-hidden="true" />
          Die Prüfung wurde wegen eines Regelverstosses automatisch beendet.
        </div>
      ) : null}
      {attempt.topicResults.length ? (
        <div className={styles.topicResults}>
          {attempt.topicResults.map((topicResult) => (
            <div key={topicResult.topicId}>
              <span>
                <strong>{topicResult.name}</strong>
                <small>
                  {topicResult.score}/{topicResult.possible} Punkte · mindestens{" "}
                  {topicResult.required} %
                </small>
              </span>
              <span
                className={ui.pill}
                data-tone={topicResult.passed ? "ready" : "draft"}
              >
                {topicResult.percentage} % ·{" "}
                {topicResult.passed ? "Bestanden" : "Nicht bestanden"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {exam.sendResults ? (
        <p className={styles.mailStatus}>
          <Mail aria-hidden="true" />
          {attempt.resultEmailStatus === "sent"
            ? "Das Ergebnis wurde per E-Mail versendet."
            : attempt.resultEmailStatus === "not-configured"
              ? "Der E-Mail-Versand ist noch nicht konfiguriert. Das Ergebnis wurde gespeichert."
              : attempt.resultEmailStatus === "failed"
                ? "Das Ergebnis wurde gespeichert, die E-Mail konnte aber nicht versendet werden."
                : "Die Ergebnis-E-Mail wird vorbereitet …"}
        </p>
      ) : null}
    </section>
  );
}
