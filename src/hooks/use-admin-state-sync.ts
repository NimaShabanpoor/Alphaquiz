"use client";

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { normalizeQuizState } from "@/lib/quiz-state-normalization";
import { seedState } from "@/lib/seed-data";
import type { ExamAttempt, ExamEvent, QuizState } from "@/lib/quiz-types";

const STORAGE_KEY = "alphaquiz-state-v2";
const LEGACY_STORAGE_KEY = "alphaquiz-state-v1";

function isPublicExamPath() {
  return window.location.pathname.startsWith("/exam/");
}

export function clearLocalAdminState() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function useAdminStateSync(
  state: QuizState,
  setState: Dispatch<SetStateAction<QuizState>>,
  showToast: (message: string) => void,
) {
  const [ready, setReady] = useState(false);
  const lastExternalEventRef = useRef("");
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const persistedState = useMemo<QuizState>(
    () => ({
      categories: state.categories,
      topics: state.topics,
      questions: state.questions,
      quizzes: state.quizzes,
      exports: state.exports,
      examPublications: state.examPublications,
      examAttempts: [],
      examEvents: [],
    }),
    [
      state.categories,
      state.examPublications,
      state.exports,
      state.questions,
      state.quizzes,
      state.topics,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      let nextState: QuizState = seedState;
      if (!isPublicExamPath()) {
        try {
          const stored =
            window.localStorage.getItem(STORAGE_KEY) ??
            window.localStorage.getItem(LEGACY_STORAGE_KEY);
          if (stored) nextState = normalizeQuizState(JSON.parse(stored));
        } catch {
          clearLocalAdminState();
        }

        try {
          const response = await fetch("/api/supabase?state=1", {
            cache: "no-store",
          });
          const data = (await response.json()) as { state?: QuizState };
          const remote = data.state;
          if (
            response.ok &&
            remote &&
            (remote.quizzes.length ||
              remote.questions.length ||
              remote.categories.length ||
              remote.examPublications.length)
          ) {
            nextState = normalizeQuizState(remote);
          }
        } catch {
          // Offline bleibt der zuletzt lokal gespeicherte Admin-Inhalt verfügbar.
        }
      }

      if (cancelled) return;
      setState(nextState);
      setReady(true);
    }

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, [setState]);

  useEffect(() => {
    if (isPublicExamPath() || !ready) return;
    let quotaTimer: number | undefined;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    } catch {
      quotaTimer = window.setTimeout(
        () =>
          showToast(
            "Der lokale Speicher ist voll. Entferne grosse Bilder oder synchronisiere mit Supabase.",
          ),
        0,
      );
    }
    return () => {
      if (quotaTimer) window.clearTimeout(quotaTimer);
    };
  }, [persistedState, ready, showToast]);

  useEffect(() => {
    if (!ready || isPublicExamPath()) return;
    const timer = window.setTimeout(() => {
      const snapshot = persistedState;
      syncQueueRef.current = syncQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const response = await fetch("/api/supabase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot),
          });
          if (response.ok) return;
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Synchronisierung fehlgeschlagen.");
        })
        .catch((error: unknown) => {
          showToast(
            error instanceof Error
              ? error.message
              : "Synchronisierung fehlgeschlagen.",
          );
        });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [persistedState, ready, showToast]);

  useEffect(() => {
    if (!ready || isPublicExamPath()) return;
    let cancelled = false;

    async function refreshActivity() {
      try {
        const response = await fetch("/api/supabase?activity=1", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          attempts?: ExamAttempt[];
          events?: ExamEvent[];
        };
        if (!response.ok || cancelled || !data.attempts || !data.events) return;
        setState((current) => ({
          ...current,
          examAttempts: data.attempts!,
          examEvents: data.events!,
        }));
        const newest = data.events.find(
          (event) =>
            event.type === "tab-hidden" ||
            event.type === "fullscreen-exit",
        );
        if (newest && newest.id !== lastExternalEventRef.current) {
          lastExternalEventRef.current = newest.id;
          const participant = data.attempts.find(
            (attempt) => attempt.id === newest.attemptId,
          );
          showToast(
            `Prüfungswarnung: ${participant?.name ?? "Teilnehmende Person"} – ${newest.message}`,
          );
        }
      } catch {
        // Ein kurzzeitiger Verbindungsfehler beendet die Admin-Oberfläche nicht.
      }
    }

    void refreshActivity();
    const timer = window.setInterval(() => void refreshActivity(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, setState, showToast]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const nextState = normalizeQuizState(JSON.parse(event.newValue));
        setState((current) => ({
          ...nextState,
          examAttempts: current.examAttempts,
          examEvents: current.examEvents,
        }));
      } catch {
        // Ein beschädigter Eintrag in einem anderen Tab wird ignoriert.
      }
    }
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, [setState]);

  return ready;
}
