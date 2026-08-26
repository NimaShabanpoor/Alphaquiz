"use client";

import { Cloud, Database, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { PageHeader, ui } from "@/components/ui";
import styles from "./page.module.css";

type Status = {
  configured: boolean;
  reachable: boolean;
  error?: string;
};

async function loadSupabaseStatus() {
  const response = await fetch("/api/supabase", { cache: "no-store" });
  const data = (await response.json()) as Status;
  if (!response.ok) {
    throw new Error(data.error || "Verbindungsprüfung fehlgeschlagen.");
  }
  return data;
}

export default function SettingsPage() {
  const { connected, resetDemo, showToast } = useQuizApp();
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(true);

  const checkConnection = useCallback(
    async (showSuccess = false) => {
      setChecking(true);
      try {
        const data = await loadSupabaseStatus();
        setStatus(data);
        if (showSuccess && data.reachable) {
          showToast("Supabase ist verbunden. Die Daten werden neu geladen.");
          window.setTimeout(() => window.location.reload(), 300);
        }
      } catch (error) {
        setStatus({ configured: false, reachable: false });
        if (showSuccess) {
          showToast(
            error instanceof Error
              ? error.message
              : "Verbindungsprüfung fehlgeschlagen.",
          );
        }
      } finally {
        setChecking(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    let cancelled = false;
    void loadSupabaseStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ configured: false, reachable: false });
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const available = Boolean(status?.reachable && connected);

  return (
    <>
      <PageHeader
        eyebrow="Einstellungen"
        lead="Supabase ist die zentrale Datenquelle. Der Browser speichert nur eine lokale Kopie für die Anzeige bei kurzen Verbindungsunterbrüchen."
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
                : available
                  ? "Verbunden. Änderungen werden automatisch gespeichert."
                  : status.reachable
                    ? "Verbindung verfügbar. Lade den aktuellen Datenstand neu."
                  : status.configured
                    ? "Konfiguriert, aber nicht erreichbar."
                    : "Noch nicht konfiguriert oder nicht angemeldet."}
            </p>
            {status?.error && !status.reachable ? (
              <p className={styles.error}>{status.error}</p>
            ) : null}
          </div>
          <span
            className={ui.pill}
            data-tone={available ? "ready" : undefined}
          >
            {available ? "Verbunden" : "Nicht verbunden"}
          </span>
          <button
            className={`${ui.button} ${ui.primary}`}
            disabled={checking}
            onClick={() => void checkConnection(true)}
            type="button"
          >
            <RefreshCw aria-hidden="true" />
            {checking ? "Wird geprüft …" : "Verbindung prüfen"}
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
              Ersetzt die in Supabase gespeicherten Inhalte durch die
              Beispieldaten.
            </p>
          </div>
          <button
            className={`${ui.button} ${ui.danger}`}
            disabled={!available}
            onClick={() => {
              resetDemo();
              showToast("Die Beispieldaten werden in Supabase gespeichert.");
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
