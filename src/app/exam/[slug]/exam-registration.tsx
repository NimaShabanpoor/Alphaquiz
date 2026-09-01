import { BookOpen, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { PublicExamMetadata } from "@/lib/quiz-types";
import { ui } from "@/components/ui";
import styles from "./page.module.css";

type ExamRegistrationProps = {
  exam: PublicExamMetadata;
  name: string;
  email: string;
  accepted: boolean;
  error: string;
  starting: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onAcceptedChange: (value: boolean) => void;
  onStart: () => void;
};

export function ExamRegistration({
  exam,
  name,
  email,
  accepted,
  error,
  starting,
  onNameChange,
  onEmailChange,
  onAcceptedChange,
  onStart,
}: ExamRegistrationProps) {
  return (
    <section className={styles.registration}>
      <div className={styles.registrationBrand}>
        <span className={styles.brandMark}>A</span>
        <span>
          <strong>ALPHAQUIZ.</strong>
          <small>QUIZ-MANAGER</small>
        </span>
      </div>
      <p className={styles.eyebrow}>Online-Prüfung</p>
      <h1>Zur Prüfung anmelden</h1>
      <p className={styles.lead}>
        Gib deinen Namen und deine E-Mail-Adresse ein. Es ist kein Passwort
        erforderlich.
      </p>
      <label className={styles.field}>
        <span>Vor- und Nachname</span>
        <input
          autoComplete="name"
          maxLength={120}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Max Muster"
          value={name}
        />
      </label>
      <label className={styles.field}>
        <span>E-Mail-Adresse</span>
        <input
          autoComplete="email"
          maxLength={254}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="max.muster@beispiel.ch"
          required
          type="email"
          value={email}
        />
      </label>
      <div className={styles.examInfo}>
        {exam.mode === "closed" ? (
          <ShieldCheck aria-hidden="true" />
        ) : (
          <BookOpen aria-hidden="true" />
        )}
        <span>
          <strong>{exam.title}</strong>
          <small>
            {exam.timeLimit} Minuten · {exam.questionCount} Fragen ·{" "}
            {exam.passPercentage} % zum Bestehen
            {exam.availableUntil
              ? ` · offen bis ${new Date(exam.availableUntil).toLocaleString(
                  "de-CH",
                )}`
              : ""}
          </small>
        </span>
        <span className={ui.pill}>1 Versuch</span>
      </div>
      <label className={styles.rules}>
        <input
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          Ich habe die Prüfungsregeln gelesen.{" "}
          {exam.mode === "closed"
            ? "Tabwechsel und das Verlassen des Vollbilds werden protokolliert."
            : "Diese Prüfung ist als Open Book freigegeben."}
        </span>
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        className={styles.startButton}
        disabled={starting}
        onClick={onStart}
        type="button"
      >
        {starting ? "Prüfung wird vorbereitet …" : "Prüfung starten"}
      </button>
      <small className={styles.privacy}>
        <LockKeyhole aria-hidden="true" /> Deine Angaben werden nur für diese
        Prüfung verarbeitet. <Link href="/privacy">Datenschutz</Link>
      </small>
    </section>
  );
}
