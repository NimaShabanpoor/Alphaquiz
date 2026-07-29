"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./page.module.css";

type Feedback = {
  tone: "error" | "success";
  text: string;
} | null;

function LoginBrand() {
  return (
    <div className={styles.brand}>
      <span aria-hidden="true" className={styles.brandMark}>
        <svg viewBox="0 0 48 48">
          <path className={styles.brandMarkLight} d="M10 39 23 9" />
          <path className={styles.brandMarkAmber} d="m23 9 15 30" />
          <path className={styles.brandMarkAmber} d="M16 28h16" />
        </svg>
      </span>
      <span className={styles.brandCopy}>
        <strong>
          ALPHASOLUTION<span>.</span>
        </strong>
        <small>ALPHAQUIZ</small>
      </span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Anmeldung fehlgeschlagen.");
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Anmeldung fehlgeschlagen.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setFeedback({
        tone: "error",
        text: "Gib zuerst deine E-Mail-Adresse ein.",
      });
      return;
    }

    setResetting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(
          result.error || "Die Rücksetz-Mail konnte nicht versendet werden.",
        );
      }
      setFeedback({
        tone: "success",
        text:
          result.message ??
          "Wenn das Konto existiert, wurde eine Rücksetz-Mail versendet.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Die Rücksetz-Mail konnte nicht versendet werden.",
      });
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section
        aria-labelledby="login-title"
        className={styles.card}
      >
        <LoginBrand />

        <div className={styles.intro}>
          <p>Interner Bereich</p>
          <h1 id="login-title">Sicher anmelden</h1>
          <span>Verwende dein freigegebenes AlphaSolution-Konto.</span>
        </div>

        <form className={styles.form} onSubmit={login}>
          <label className={styles.field}>
            <span>E-Mail-Adresse</span>
            <input
              autoComplete="email"
              autoFocus
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.passwordLabel}>
              <label htmlFor="login-password">Passwort</label>
              <button
                disabled={resetting}
                onClick={() => void resetPassword()}
                type="button"
              >
                {resetting ? "Wird versendet …" : "Passwort vergessen?"}
              </button>
            </span>
            <input
              autoComplete="current-password"
              id="login-password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {feedback ? (
            <p
              className={styles.feedback}
              data-tone={feedback.tone}
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.text}
            </p>
          ) : null}

          <button className={styles.submit} disabled={loading} type="submit">
            {loading ? "Wird angemeldet …" : "Anmelden"}
          </button>
        </form>
      </section>
    </main>
  );
}
