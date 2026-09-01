import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Datenschutz",
};

export default function PrivacyPage() {
  const contact =
    process.env.PRIVACY_CONTACT_EMAIL ?? "Betreiberangaben nicht konfiguriert";

  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <p className={styles.eyebrow}>AlphaQuiz</p>
        <h1>Datenschutzhinweise</h1>
        <p>
          AlphaQuiz verarbeitet bei einer Prüfung den Namen, die
          E-Mail-Adresse, Antworten, Zeitangaben, Resultate und – bei
          geschlossenen Prüfungen – protokollierte Tab- oder Vollbildwechsel.
        </p>

        <h2>Zweck</h2>
        <p>
          Die Daten werden zur Durchführung, Überwachung und Auswertung der
          Prüfung sowie zum Versand des Resultats verwendet.
        </p>

        <h2>Empfänger und Speicherung</h2>
        <p>
          Die Prüfungsdaten werden in der konfigurierten Supabase-Datenbank
          gespeichert. Falls der Ergebnisversand aktiviert ist, wird die
          E-Mail über Resend versendet. Der Betreiber legt die
          Aufbewahrungsfrist fest und löscht nicht mehr benötigte Daten.
        </p>

        <h2>Kontakt und Rechte</h2>
        <p>
          Für Auskunft, Berichtigung oder Löschung wende dich an{" "}
          <strong>{contact}</strong>. Abhängig vom Einsatzort können weitere
          gesetzliche Rechte bestehen.
        </p>

        <p className={styles.notice}>
          Diese Seite beschreibt die technischen Standardfunktionen. Der
          Betreiber muss die Angaben, Rechtsgrundlage und Aufbewahrungsfristen
          vor dem produktiven Einsatz an seine Organisation anpassen.
        </p>

        <Link className={styles.back} href="/login">
          Zurück
        </Link>
      </article>
    </main>
  );
}
