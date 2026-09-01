import { AlertTriangle } from "lucide-react";
import styles from "./page.module.css";

type ExamWarningProps = {
  violationCount: number;
  maxViolations: number;
  onContinue: () => void;
};

export function ExamWarning({
  violationCount,
  maxViolations,
  onContinue,
}: ExamWarningProps) {
  return (
    <div className={styles.warningBackdrop}>
      <section
        aria-labelledby="violation-title"
        aria-modal="true"
        className={styles.warningModal}
        role="dialog"
      >
        <span>
          <AlertTriangle aria-hidden="true" />
        </span>
        <h2 id="violation-title">Tabwechsel erkannt</h2>
        <p>
          Du hast den Prüfungstab oder das Vollbild verlassen. Der Verstoss
          wurde gespeichert und dem Administrator gemeldet.
        </p>
        <strong>
          Verstoss {violationCount} von {maxViolations}
        </strong>
        <button onClick={onContinue} type="button">
          Prüfung fortsetzen
        </button>
        <small>
          Der nächste Verstoss kann die Prüfung automatisch beenden.
        </small>
      </section>
    </div>
  );
}
