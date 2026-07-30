"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuizApp } from "@/components/app-provider";
import { ui } from "@/components/ui";
import { examTopicId } from "@/lib/exam-randomization";
import { calculateExamResult } from "@/lib/exam-scoring";
import type {
  ExamAttemptStatus,
  ExamEventType,
  Question,
} from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function formatTime(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const rest = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function PublicExamPage() {
  const params = useParams<{ slug: string }>();
  const {
    state,
    ready,
    startExamAttempt,
    updateExamAttempt,
    addExamEvent,
  } = useQuizApp();
  const publication = state.examPublications.find(
    (item) => item.slug === params.slug,
  );
  const quiz = state.quizzes.find(
    (item) => item.id === publication?.quizId,
  );
  const quizQuestions = useMemo(
    () =>
      quiz?.questionIds
        .map((id) => state.questions.find((question) => question.id === id))
        .filter((question): question is Question => Boolean(question)) ?? [],
    [quiz, state.questions],
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [attemptId, setAttemptId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.sessionStorage.getItem(
          `alphaquiz-attempt-${params.slug}`,
        ) ?? ""),
  );
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [warning, setWarning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const finishingRef = useRef(false);
  const lastViolationRef = useRef(0);
  const attempt = state.examAttempts.find((item) => item.id === attemptId);
  const questions = attempt?.instance?.questions ?? quizQuestions;
  const question = questions[attempt?.currentQuestion ?? 0];

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const sendResultEmail = useCallback(
    async (
      currentAttemptId: string,
      status: ExamAttemptStatus,
      result: ReturnType<typeof calculateExamResult>,
    ) => {
      if (!publication?.sendResults || !quiz || !attempt) return;
      try {
        const response = await fetch("/api/exam-results/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: currentAttemptId,
            name: attempt.name,
            email: attempt.email,
            quizTitle: quiz.title,
            status,
            ...result,
          }),
        });
        const data = (await response.json()) as {
          sent?: boolean;
          configured?: boolean;
        };
        updateExamAttempt(currentAttemptId, {
          resultEmailStatus: data.sent
            ? "sent"
            : data.configured === false
              ? "not-configured"
              : "failed",
        });
      } catch {
        updateExamAttempt(currentAttemptId, {
          resultEmailStatus: "failed",
        });
      }
    },
    [attempt, publication?.sendResults, quiz, updateExamAttempt],
  );

  const finishExam = useCallback(
    async (status: "submitted" | "terminated") => {
      if (
        finishingRef.current ||
        !attempt ||
        attempt.status !== "in-progress" ||
        !publication ||
        !quiz
      ) {
        return;
      }
      finishingRef.current = true;
      const result = calculateExamResult(
        attempt.instance?.quizSnapshot ?? quiz,
        questions,
        state.topics,
        attempt.responses,
      );
      const submittedAt = new Date().toISOString();
      updateExamAttempt(attempt.id, {
        ...result,
        status,
        submittedAt,
      });
      addExamEvent({
        publicationId: publication.id,
        attemptId: attempt.id,
        type: status,
        message:
          status === "terminated"
            ? "Prüfung wegen Regelverstoss beendet"
            : "Prüfung abgegeben",
      });
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      await sendResultEmail(attempt.id, status, result);
      finishingRef.current = false;
    },
    [
      addExamEvent,
      attempt,
      publication,
      questions,
      quiz,
      sendResultEmail,
      state.topics,
      updateExamAttempt,
    ],
  );

  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "in-progress" ||
      !publication?.timeLimit
    ) {
      return;
    }
    function updateTimer() {
      const elapsed = Math.floor(
        (Date.now() - new Date(attempt!.startedAt).getTime()) / 1000,
      );
      const next = Math.max(0, publication!.timeLimit * 60 - elapsed);
      setRemaining(next);
      if (next === 0) void finishExam("submitted");
    }
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, finishExam, publication]);

  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "in-progress" ||
      publication?.mode !== "closed"
    ) {
      return;
    }

    function recordViolation(type: ExamEventType, message: string) {
      if (finishingRef.current) return;
      const now = Date.now();
      if (now - lastViolationRef.current < 900) return;
      lastViolationRef.current = now;
      const nextCount = attempt!.violationCount + 1;
      updateExamAttempt(attempt!.id, { violationCount: nextCount });
      addExamEvent({
        publicationId: publication!.id,
        attemptId: attempt!.id,
        type,
        message,
      });
      if (nextCount >= publication!.maxViolations) {
        void finishExam("terminated");
      } else {
        setWarning(true);
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        recordViolation("tab-hidden", "Prüfungs-Tab verlassen");
      }
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement && !document.hidden) {
        recordViolation("fullscreen-exit", "Vollbild verlassen");
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [
    addExamEvent,
    attempt,
    finishExam,
    publication,
    updateExamAttempt,
  ]);

  async function start() {
    setError("");
    if (!publication || !quiz) return;
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
      const result = await startExamAttempt(
        publication.id,
        name,
        normalizedEmail,
      );
      if (!result.attemptId) {
        setError(result.error ?? "Die Prüfung konnte nicht gestartet werden.");
        return;
      }
      window.sessionStorage.setItem(
        `alphaquiz-attempt-${publication.slug}`,
        result.attemptId,
      );
      setAttemptId(result.attemptId);
      if (publication.mode === "closed" && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {
          setWarning(true);
        });
      }
    } finally {
      setStarting(false);
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
    updateExamAttempt(attempt.id, {
      responses: { ...attempt.responses, [question.id]: next },
    });
  }

  async function continueAfterWarning() {
    setWarning(false);
    if (
      publication?.mode === "closed" &&
      !document.fullscreenElement &&
      attempt?.status === "in-progress"
    ) {
      await document.documentElement.requestFullscreen().catch(() => {
        setError("Das Vollbild konnte nicht aktiviert werden.");
      });
    }
  }

  if (!ready) {
    return <main className={styles.centerState}>Prüfung wird geladen …</main>;
  }

  if (!publication || !quiz) {
    return (
      <main className={styles.centerState}>
        <XCircle aria-hidden="true" />
        <h1>Prüfung nicht gefunden</h1>
        <p>Der verwendete Link ist ungültig oder wurde entfernt.</p>
      </main>
    );
  }

  const opensLater =
    publication.availableFrom &&
    currentTime < new Date(publication.availableFrom).getTime();
  const availabilityEnded =
    publication.availableUntil &&
    currentTime > new Date(publication.availableUntil).getTime();

  if ((!publication.active || opensLater || availabilityEnded) && !attempt) {
    const message = opensLater
      ? `Diese Prüfung öffnet am ${new Date(
          publication.availableFrom!,
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
            <strong className={styles.examTitle}>{quiz.title}</strong>
            <span className={styles.examStatus}>
              <Clock3 aria-hidden="true" /> {formatTime(remaining)}
              <span data-mode={publication.mode}>
                {publication.mode === "closed" ? (
                  <ShieldCheck aria-hidden="true" />
                ) : (
                  <BookOpen aria-hidden="true" />
                )}
                {publication.mode === "closed"
                  ? "Prüfungsmodus"
                  : "Open Book"}
              </span>
            </span>
          </>
        ) : null}
      </header>

      <main className={styles.content}>
        {!attempt ? (
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
              Gib deinen Namen und deine E-Mail-Adresse ein. Es ist kein
              Passwort erforderlich.
            </p>
            <label className={styles.field}>
              <span>Vor- und Nachname</span>
              <input
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Max Muster"
                value={name}
              />
            </label>
            <label className={styles.field}>
              <span>E-Mail-Adresse</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="max.muster@beispiel.ch"
                required
                type="email"
                value={email}
              />
            </label>
            <div className={styles.examInfo}>
              {publication.mode === "closed" ? (
                <ShieldCheck aria-hidden="true" />
              ) : (
                <BookOpen aria-hidden="true" />
              )}
              <span>
                <strong>{quiz.title}</strong>
                <small>
                  {publication.timeLimit} Minuten · {questions.length} Fragen ·{" "}
                  {quiz.passPercentage} % zum Bestehen
                  {publication.availableUntil
                    ? ` · offen bis ${new Date(
                        publication.availableUntil,
                      ).toLocaleString("de-CH")}`
                    : ""}
                </small>
              </span>
              <span className={ui.pill}>1 Versuch</span>
            </div>
            <label className={styles.rules}>
              <input
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                type="checkbox"
              />
              <span>
                Ich habe die Prüfungsregeln gelesen.{" "}
                {publication.mode === "closed"
                  ? "Tabwechsel und das Verlassen des Vollbilds werden protokolliert."
                  : "Diese Prüfung ist als Open Book freigegeben."}
              </span>
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button
              className={styles.startButton}
              disabled={starting}
              onClick={() => void start()}
              type="button"
            >
              {starting ? "Prüfung wird vorbereitet …" : "Prüfung starten"}
            </button>
            <small className={styles.privacy}>
              <LockKeyhole aria-hidden="true" /> Deine Angaben werden sicher
              verarbeitet.
            </small>
          </section>
        ) : resultFinished ? (
          <section className={styles.result}>
            <span className={styles.resultIcon} data-passed={attempt.passed}>
              {attempt.passed ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
            </span>
            <p className={styles.eyebrow}>
              {attempt.status === "terminated"
                ? "Prüfung beendet"
                : "Prüfung abgeschlossen"}
            </p>
            <h1>
              {attempt.score} von {attempt.possible} Punkten
            </h1>
            <p className={styles.resultLead}>
              {attempt.percentage} % ·{" "}
              <strong>
                {attempt.passed ? "Bestanden" : "Nicht bestanden"}
              </strong>
            </p>
            {attempt.status === "terminated" ? (
              <div className={styles.terminated}>
                <AlertTriangle aria-hidden="true" />
                Die Prüfung wurde wegen eines Regelverstosses automatisch
                beendet.
              </div>
            ) : null}
            <div className={styles.topicResults}>
              {attempt.topicResults.map((topicResult) => (
                <div key={topicResult.topicId}>
                  <span>
                    <strong>{topicResult.name}</strong>
                    <small>
                      {topicResult.score}/{topicResult.possible} Punkte ·
                      mindestens {topicResult.required} %
                    </small>
                  </span>
                  <span
                    className={ui.pill}
                    data-tone={topicResult.passed ? "ready" : "draft"}
                  >
                    {topicResult.percentage} % ·{" "}
                    {topicResult.passed ? "Bestanden" : "Nicht bestanden"}
                  </span>
                </div>
              ))}
            </div>
            {publication.sendResults ? (
              <p className={styles.mailStatus}>
                <Mail aria-hidden="true" />
                {attempt.resultEmailStatus === "sent"
                  ? "Das Ergebnis wurde per E-Mail versendet."
                  : attempt.resultEmailStatus === "not-configured"
                    ? "Resend ist lokal noch nicht konfiguriert. Das Ergebnis wurde gespeichert."
                    : attempt.resultEmailStatus === "failed"
                      ? "Das Ergebnis wurde gespeichert, die E-Mail konnte aber nicht versendet werden."
                      : "Die Ergebnis-E-Mail wird vorbereitet …"}
              </p>
            ) : null}
          </section>
        ) : question ? (
          <section className={styles.player}>
            <div className={styles.progressHead}>
              <span>
                Frage {(attempt?.currentQuestion ?? 0) + 1} von{" "}
                {questions.length}
              </span>
              <div>
                <span
                  style={{
                    width: `${
                      (((attempt?.currentQuestion ?? 0) + 1) /
                        questions.length) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className={styles.questionBody}>
              <p className={styles.eyebrow}>
                {attempt.instance?.topicLabelById[
                  examTopicId(
                    question,
                    attempt.instance.quizSnapshot,
                    attempt.instance.configSnapshot.useTopics,
                  )
                ] ??
                  state.topics.find(
                    (topic) => topic.id === question.topicId,
                  )?.name ??
                  "Ohne Unterkategorie"}{" "}
                · {questionTypeLabels[question.type]} · {question.points}{" "}
                {question.points === 1 ? "Punkt" : "Punkte"}
              </p>
              <h1>{question.title}</h1>
              {question.image ? (
                <figure className={styles.questionImage}>
                  <Image
                    alt={question.image.alt || "Bild zur Frage"}
                    height={520}
                    priority
                    src={question.image.dataUrl}
                    unoptimized
                    width={900}
                  />
                  {question.image.alt ? (
                    <figcaption>{question.image.alt}</figcaption>
                  ) : null}
                </figure>
              ) : null}
              <p className={styles.questionDescription}>
                {question.description ||
                  (question.type === "multiple"
                    ? "Mehrere Antworten können richtig sein."
                    : "Wähle die passende Antwort.")}
              </p>
              {question.type === "text" ? (
                <textarea
                  onChange={(event) =>
                    updateExamAttempt(attempt.id, {
                      responses: {
                        ...attempt.responses,
                        [question.id]: [event.target.value],
                      },
                    })
                  }
                  placeholder="Antwort eingeben …"
                  value={attempt.responses[question.id]?.[0] ?? ""}
                />
              ) : (
                <div className={styles.options}>
                  {question.answers.map((answer, answerIndex) => {
                    const selected = (
                      attempt.responses[question.id] ?? []
                    ).includes(answer.id);
                    return (
                      <button
                        aria-pressed={selected}
                        data-selected={selected}
                        key={answer.id}
                        onClick={() => choose(answer.id)}
                        type="button"
                      >
                        <span>{String.fromCharCode(65 + answerIndex)}</span>
                        {answer.text}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className={styles.actions}>
                <button
                  disabled={attempt.currentQuestion === 0}
                  onClick={() =>
                    updateExamAttempt(attempt.id, {
                      currentQuestion: attempt.currentQuestion - 1,
                    })
                  }
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" /> Zurück
                </button>
                <button
                  className={styles.primaryAction}
                  onClick={() => {
                    if (attempt.currentQuestion === questions.length - 1) {
                      void finishExam("submitted");
                    } else {
                      updateExamAttempt(attempt.id, {
                        currentQuestion: attempt.currentQuestion + 1,
                      });
                    }
                  }}
                  type="button"
                >
                  {attempt.currentQuestion === questions.length - 1
                    ? "Prüfung abgeben"
                    : "Weiter"}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.centerState}>
            <XCircle aria-hidden="true" />
            <h1>Keine Fragen vorhanden</h1>
            <p>Der Administrator muss diesem Quiz zuerst Fragen hinzufügen.</p>
          </section>
        )}
      </main>

      {warning && attempt?.status === "in-progress" ? (
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
              Du hast den Prüfungs-Tab oder das Vollbild verlassen. Der Verstoss
              wurde gespeichert und dem Administrator gemeldet.
            </p>
            <strong>
              Verstoss {attempt.violationCount} von{" "}
              {publication.maxViolations}
            </strong>
            <button onClick={() => void continueAfterWarning()} type="button">
              Prüfung fortsetzen
            </button>
            <small>
              Der nächste Verstoss kann die Prüfung automatisch beenden.
            </small>
          </section>
        </div>
      ) : null}
    </div>
  );
}
