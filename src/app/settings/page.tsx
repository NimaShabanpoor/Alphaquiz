"use client";

import { Cloud, Database, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { PageHeader, ui } from "@/components/ui";
import styles from "./page.module.css";

type Status = {
  configured: boolean;
  reachable: boolean;
  error?: string;
};

export default function SettingsPage() {
  const { state, resetDemo, showToast } = useQuizApp();
  const [status, setStatus] = useState<Status | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void fetch("/api/supabase")
      .then((response) => response.json())
      .then((data: Status) => setStatus(data))
      .catch(() =>
        setStatus({ configured: false, reachable: false }),
      );
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state,
          examAttempts: [],
          examEvents: [],
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        syncedAt?: string;
      };
      if (!response.ok) throw new Error(data.error || "Sync fehlgeschlagen.");
      showToast("Daten wurden mit Supabase synchronisiert.");
      setStatus({ configured: true, reachable: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Sync fehlgeschlagen.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Einstellungen"
        lead="Lokale Daten funktionieren sofort. Supabase kann über Server-Umgebungsvariablen verbunden werden."
        title="Verbindungen."
      />

      <section className={styles.grid}>
        <article className={`${ui.card} ${styles.card}`}>
          <span className={styles.icon}>
            <Database aria-hidden="true" />
          </span>
          <div>
            <small>Datenbank</small>
            <h2>Supabase</h2>
            <p>
              {status === null
                ? "Verbindung wird geprüft …"
                : status.reachable
                  ? "Verbunden und bereit zur Synchronisierung."
                  : status.configured
                    ? "Konfiguriert, aber nicht erreichbar."
                    : "Noch nicht konfiguriert. Die App speichert lokal."}
            </p>
            {status?.error && !status.reachable ? (
              <p className={styles.error}>{status.error}</p>
            ) : null}
          </div>
          <span
            className={ui.pill}
            data-tone={status?.reachable ? "ready" : undefined}
          >
            {status?.reachable ? "Verbunden" : "Lokaler Modus"}
          </span>
          <button
            className={`${ui.button} ${ui.primary}`}
            disabled={!status?.reachable || syncing}
            onClick={() => void sync()}
            type="button"
          >
            <RefreshCw aria-hidden="true" />
            {syncing ? "Synchronisiert …" : "Jetzt synchronisieren"}
          </button>
        </article>

        <article className={`${ui.card} ${styles.card}`}>
          <span className={styles.icon}>
            <Cloud aria-hidden="true" />
          </span>
          <div>
            <small>Backend</small>
            <h2>Next.js API</h2>
            <p>
              Import, Export und Supabase-Zugriff laufen serverseitig. Geheime
              Zugangsdaten werden nicht an den Browser ausgeliefert.
            </p>
          </div>
          <span className={ui.pill} data-tone="ready">
            Aktiv
          </span>
        </article>

        <article className={`${ui.card} ${styles.card}`}>
          <span className={styles.icon}>
            <RotateCcw aria-hidden="true" />
          </span>
          <div>
            <small>Lokale Daten</small>
            <h2>Demo zurücksetzen</h2>
            <p>
              Entfernt deine lokalen Änderungen und lädt die Beispieldaten neu.
            </p>
          </div>
          <button
            className={`${ui.button} ${ui.danger}`}
            onClick={() => {
              resetDemo();
              showToast("Die lokalen Beispieldaten wurden zurückgesetzt.");
            }}
            type="button"
          >
            Zurücksetzen
          </button>
        </article>
      </section>
    </>
  );
}
