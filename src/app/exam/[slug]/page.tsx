"use client";

import { BookOpen, Clock3, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ExamEventType,
  PublicExamAttempt,
  PublicExamMetadata,
} from "@/lib/quiz-types";
import { ExamPlayer } from "./exam-player";
import { ExamRegistration } from "./exam-registration";
import { ExamResult } from "./exam-result";
import { ExamWarning } from "./exam-warning";
import styles from "./page.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type ExamApiResponse = {
  exam?: PublicExamMetadata;
  attempt?: PublicExamAttempt;
  error?: string;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const rest = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

async function readExamResponse(response: Response) {
  const data = (await response.json()) as ExamApiResponse;
  if (!response.ok) {
    throw new Error(data.error ?? "Die Prüfung konnte nicht geladen werden.");
  }
  return data;
}

export default function PublicExamPage() {
  const params = useParams<{ slug: string }>();
  const [exam, setExam] = useState<PublicExamMetadata | null>(null);
  const [attempt, setAttempt] = useState<PublicExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const finishingRef = useRef(false);
  const lastViolationRef = useRef(0);
  const attemptRef = useRef<PublicExamAttempt | null>(null);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      const storageKey = `alphaquiz-attempt-${params.slug}`;
      const storedAttemptId = window.sessionStorage.getItem(storageKey);
      try {
        if (storedAttemptId) {
          try {
            const resumed = await readExamResponse(
              await fetch(`/api/public/exam-attempts/${storedAttemptId}`, {
                cache: "no-store",
              }),
            );
            if (!cancelled) {
              setExam(resumed.exam ?? null);
              setAttempt(resumed.attempt ?? null);
              return;
            }
          } catch {
            window.sessionStorage.removeItem(storageKey);
          }
        }

        const metadata = await readExamResponse(
          await fetch(`/api/public/exams/${encodeURIComponent(params.slug)}`, {
            cache: "no-store",
          }),
        );
        if (!cancelled) setExam(metadata.exam ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Die Prüfung konnte nicht geladen werden.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const updateAttempt = useCallback(
    async (patch: Record<string, unknown>) => {
      const current = attemptRef.current;
      if (!current) return null;
      const data = await readExamResponse(
        await fetch(`/api/public/exam-attempts/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
      );
      if (data.exam) setExam(data.exam);
      if (data.attempt) setAttempt(data.attempt);
      return data.attempt ?? null;
    },
    [],
  );

  const finishExam = useCallback(async () => {
    const current = attemptRef.current;
    if (
      finishingRef.current ||
      !current ||
      current.status !== "in-progress"
    ) {
      return;
    }
    finishingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const data = await readExamResponse(
        await fetch(`/api/public/exam-attempts/${current.id}`, {
          method: "POST",
        }),
      );
      if (data.exam) setExam(data.exam);
      if (data.attempt) setAttempt(data.attempt);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : "Die Prüfung konnte nicht abgegeben werden.",
      );
    } finally {
      setSaving(false);
      finishingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "in-progress" ||
      !exam?.timeLimit
    ) {
      return;
    }

    function updateTimer() {
      const elapsed = Math.floor(
        (Date.now() - new Date(attempt!.startedAt).getTime()) / 1000,
      );
      const next = Math.max(0, exam!.timeLimit * 60 - elapsed);
      setRemaining(next);
      if (next === 0) void finishExam();
    }

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, exam, finishExam]);

  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "in-progress" ||
      exam?.mode !== "closed"
    ) {
      return;
    }

    async function recordViolation(
      type: Extract<ExamEventType, "tab-hidden" | "fullscreen-exit">,
    ) {
      if (finishingRef.current) return;
      const now = Date.now();
      if (now - lastViolationRef.current < 900) return;
      lastViolationRef.current = now;
      try {
        const updated = await updateAttempt({ eventType: type });
        if (updated?.status === "in-progress") setWarning(true);
      } catch (violationError) {
        setError(
          violationError instanceof Error
            ? violationError.message
            : "Der Regelverstoss konnte nicht gespeichert werden.",
        );
      }
    }

    function onVisibilityChange() {
      if (document.hidden) void recordViolation("tab-hidden");
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement && !document.hidden) {
        void recordViolation("fullscreen-exit");
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [attempt, exam?.mode, updateAttempt]);

  async function start() {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || !normalizedEmail) {
      setError("Bitte gib deinen Namen und deine E-Mail-Adresse ein.");
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(
        "Bitte gib eine gültige E-Mail-Adresse ein, zum Beispiel name@firma.ch.",
      );
      return;
    }
    if (!accepted) {
      setError("Bitte bestätige zuerst die Prüfungsregeln.");
      return;
    }

    setStarting(true);
    try {
      const data = await readExamResponse(
        await fetch(`/api/public/exams/${encodeURIComponent(params.slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email: normalizedEmail }),
        }),
      );
      if (!data.attempt || !data.exam) {
        throw new Error("Die Prüfung konnte nicht gestartet werden.");
      }
      setExam(data.exam);
      setAttempt(data.attempt);
      window.sessionStorage.setItem(
        `alphaquiz-attempt-${params.slug}`,
        data.attempt.id,
      );
      if (data.exam.mode === "closed" && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {
          setWarning(true);
        });
      }
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Die Prüfung konnte nicht gestartet werden.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function saveResponse(questionId: string, response: string[]) {
    const current = attemptRef.current;
    if (!current) return;
    setAttempt({
      ...current,
      responses: { ...current.responses, [questionId]: response },
    });
    try {
      await updateAttempt({ questionId, response });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Die Antwort konnte nicht gespeichert werden.",
      );
    }
  }

  function choose(answerId: string) {
    if (!attempt || !question) return;
    const selected = attempt.responses[question.id] ?? [];
    const allowsMultiple =
      question.type === "multiple" ||
      question.type === "order" ||
      question.type === "match";
    const next = allowsMultiple
      ? selected.includes(answerId)
        ? selected.filter((id) => id !== answerId)
        : [...selected, answerId]
      : [answerId];
    void saveResponse(question.id, next);
  }

  async function moveTo(nextQuestion: number) {
    if (!attempt) return;
    const previous = attempt.currentQuestion;
    setAttempt({ ...attempt, currentQuestion: nextQuestion });
    try {
      await updateAttempt({ currentQuestion: nextQuestion });
    } catch (moveError) {
      setAttempt((current) =>
        current ? { ...current, currentQuestion: previous } : current,
      );
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Die Fragenposition konnte nicht gespeichert werden.",
      );
    }
  }

  async function continueAfterWarning() {
    setWarning(false);
    if (
      exam?.mode === "closed" &&
      !document.fullscreenElement &&
      attempt?.status === "in-progress"
    ) {
      await document.documentElement.requestFullscreen().catch(() => {
        setError("Das Vollbild konnte nicht aktiviert werden.");
      });
    }
  }

  if (loading) {
    return <main className={styles.centerState}>Prüfung wird geladen …</main>;
  }

  if (!exam) {
    return (
      <main className={styles.centerState}>
        <XCircle aria-hidden="true" />
        <h1>Prüfung nicht gefunden</h1>
        <p>{error || "Der verwendete Link ist ungültig oder wurde entfernt."}</p>
      </main>
    );
  }

  const opensLater =
    exam.availableFrom &&
    currentTime < new Date(exam.availableFrom).getTime();
  const availabilityEnded =
    exam.availableUntil &&
    currentTime > new Date(exam.availableUntil).getTime();
  if ((!exam.active || opensLater || availabilityEnded) && !attempt) {
    const message = opensLater
      ? `Diese Prüfung öffnet am ${new Date(
          exam.availableFrom!,
        ).toLocaleString("de-CH")}.`
      : availabilityEnded
        ? "Der Zeitraum für diese Prüfung ist abgelaufen."
        : "Der Administrator hat diese Prüfung noch nicht freigeschaltet.";
    return (
      <main className={styles.centerState}>
        <LockKeyhole aria-hidden="true" />
        <h1>{opensLater ? "Prüfung noch nicht geöffnet" : "Prüfung geschlossen"}</h1>
        <p>{message}</p>
      </main>
    );
  }

  const questions = attempt?.questions ?? [];
  const question = questions[attempt?.currentQuestion ?? 0];
  const resultFinished =
    attempt?.status === "submitted" || attempt?.status === "terminated";

  return (
    <div className={styles.publicPage}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.brandMark}>A</span>
          <span>
            <strong>ALPHAQUIZ.</strong>
            <small>QUIZ-MANAGER</small>
          </span>
        </span>
        {attempt?.status === "in-progress" ? (
          <>
            <strong className={styles.examTitle}>{exam.title}</strong>
            <span className={styles.examStatus}>
              <Clock3 aria-hidden="true" /> {formatTime(remaining)}
              <span data-mode={exam.mode}>
                {exam.mode === "closed" ? (
                  <ShieldCheck aria-hidden="true" />
                ) : (
                  <BookOpen aria-hidden="true" />
                )}
                {exam.mode === "closed" ? "Prüfungsmodus" : "Open Book"}
              </span>
            </span>
          </>
        ) : null}
      </header>

      <main className={styles.content}>
        {!attempt ? (
          <ExamRegistration
            accepted={accepted}
            email={email}
            error={error}
            exam={exam}
            name={name}
            onAcceptedChange={setAccepted}
            onEmailChange={setEmail}
            onNameChange={setName}
            onStart={() => void start()}
            starting={starting}
          />
        ) : resultFinished ? (
          <ExamResult attempt={attempt} exam={exam} />
        ) : question ? (
          <ExamPlayer
            attempt={attempt}
            error={error}
            onChoose={choose}
            onFinish={() => void finishExam()}
            onMove={(questionIndex) => void moveTo(questionIndex)}
            onTextChange={(questionId, value) => {
              const current = attemptRef.current;
              if (!current) return;
              setAttempt({
                ...current,
                responses: {
                  ...current.responses,
                  [questionId]: [value],
                },
              });
            }}
            onTextSave={(questionId, value) =>
              void saveResponse(questionId, [value])
            }
            question={question}
            saving={saving}
          />
        ) : (
          <section className={styles.centerState}>
            <XCircle aria-hidden="true" />
            <h1>Keine Fragen vorhanden</h1>
            <p>Der Administrator muss diesem Quiz zuerst Fragen hinzufügen.</p>
          </section>
        )}
      </main>

      {warning && attempt?.status === "in-progress" ? (
        <ExamWarning
          maxViolations={exam.maxViolations}
          onContinue={() => void continueAfterWarning()}
          violationCount={attempt.violationCount}
        />
      ) : null}
    </div>
  );
}
