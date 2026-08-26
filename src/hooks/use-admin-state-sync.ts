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
import { emptyQuizState } from "@/lib/seed-data";
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

function readCachedAdminState() {
  const stored =
    window.localStorage.getItem(STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return stored ? normalizeQuizState(JSON.parse(stored)) : emptyQuizState;
}

function cacheAdminState(state: QuizState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function useAdminStateSync(
  state: QuizState,
  setState: Dispatch<SetStateAction<QuizState>>,
  showToast: (message: string) => void,
) {
  const [ready, setReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
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
      if (isPublicExamPath()) {
        if (cancelled) return;
        setState(emptyQuizState);
        setReady(true);
        return;
      }

      try {
        const response = await fetch("/api/supabase?state=1", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          error?: string;
          state?: QuizState;
        };
        if (!response.ok || !data.state) {
          throw new Error(data.error ?? "Supabase-Daten konnten nicht geladen werden.");
        }

        const remoteState = normalizeQuizState(data.state);
        if (cancelled) return;
        setState(remoteState);
        setRemoteReady(true);
        setReady(true);
        try {
          cacheAdminState({
            ...remoteState,
            examAttempts: [],
            examEvents: [],
          });
        } catch {
          showToast(
            "Der lokale Zwischenspeicher ist voll. Die Daten bleiben in Supabase gespeichert.",
          );
        }
      } catch {
        let cachedState = emptyQuizState;
        try {
          cachedState = readCachedAdminState();
        } catch {
          clearLocalAdminState();
        }
        if (cancelled) return;
        setState(cachedState);
        setRemoteReady(false);
        setReady(true);
        showToast(
          "Supabase ist nicht erreichbar. Es wird nur der letzte gespeicherte Stand angezeigt.",
        );
      }
    }

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, [setState, showToast]);

  useEffect(() => {
    if (!ready || !remoteReady || isPublicExamPath()) return;
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
          if (response.ok) {
            try {
              cacheAdminState(snapshot);
            } catch {
              showToast(
                "Der lokale Zwischenspeicher ist voll. Die Daten bleiben in Supabase gespeichert.",
              );
            }
            return;
          }
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
  }, [persistedState, ready, remoteReady, showToast]);

  useEffect(() => {
    if (!ready || !remoteReady || isPublicExamPath()) return;
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
  }, [ready, remoteReady, setState, showToast]);

  return { connected: remoteReady, ready };
}
