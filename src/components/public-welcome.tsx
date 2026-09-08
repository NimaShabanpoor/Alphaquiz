import Link from "next/link";
import styles from "./public-welcome.module.css";

export default function PublicWelcome({ notFound = false }: { notFound?: boolean }) {
  return <main className={styles.page}>
    <section className={styles.card} aria-labelledby="public-title">
      <p className={styles.brand}>ALPHAQUIZ<span>.</span></p>
      <h1 id="public-title">{notFound ? "Seite nicht gefunden." : "Willkommen bei AlphaQuiz."}</h1>
      <p>Für die Teilnahme benötigst du den Prüfungslink deiner Prüfungsleitung.</p>
      <p>Wenn dir der Link fehlt oder nicht funktioniert, wende dich bitte an deine Prüfungsleitung.</p>
      {notFound ? <Link href="/">Zur Startseite</Link> : null}
      <footer><Link href="/privacy">Datenschutz</Link></footer>
    </section>
  </main>;
}
