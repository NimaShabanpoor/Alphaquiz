"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { seedState } from "@/lib/seed-data";
import type {
  Category,
  ExamAttempt,
  ExamAttemptStatus,
  ExamEvent,
  ExamEventType,
  ExamPublication,
  ExportRecord,
  Question,
  Quiz,
  QuizState,
  Topic,
} from "@/lib/quiz-types";

const STORAGE_KEY = "alphaquiz-state-v2";
const LEGACY_STORAGE_KEY = "alphaquiz-state-v1";

type AppContextValue = {
  state: QuizState;
  ready: boolean;
  toast: string;
  showToast: (message: string) => void;
  createQuiz: () => string;
  updateQuiz: (id: string, patch: Partial<Quiz>) => void;
  deleteQuiz: (id: string) => void;
  createQuestion: (categoryId?: string, topicId?: string) => string;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  addQuestionToQuiz: (quizId: string, questionId: string) => void;
  removeQuestionFromQuiz: (quizId: string, questionId: string) => void;
  createCategory: (name: string) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  createTopic: (categoryId: string, name: string) => string;
  updateTopic: (id: string, patch: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  createExamPublication: (quizId: string) => string;
  updateExamPublication: (
    id: string,
    patch: Partial<ExamPublication>,
  ) => void;
  startExamAttempt: (
    publicationId: string,
    name: string,
    email: string,
  ) => { attemptId?: string; error?: string };
  updateExamAttempt: (id: string, patch: Partial<ExamAttempt>) => void;
  addExamEvent: (
    event: Omit<ExamEvent, "id" | "createdAt">,
  ) => string;
  resetExamAttempt: (id: string) => void;
  importQuestions: (questions: Question[], categories: Category[]) => number;
  recordExport: (record: Omit<ExportRecord, "id" | "createdAt">) => void;
  resetDemo: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "pruefung"
  );
}

function normalizeState(stored: Partial<QuizState>): QuizState {
  const categories = Array.isArray(stored.categories)
    ? stored.categories
    : seedState.categories;
  const sourceTopics = Array.isArray(stored.topics)
    ? stored.topics
    : seedState.topics.filter((topic) =>
        categories.some((category) => category.id === topic.categoryId),
      );
  const topics = [...sourceTopics];

  for (const category of categories) {
    if (!topics.some((topic) => topic.categoryId === category.id)) {
      topics.push({
        id: `topic-${category.id}-allgemein`,
        categoryId: category.id,
        name: "Allgemein",
      });
    }
  }

  const questions = (stored.questions ?? seedState.questions).map(
    (question) => ({
      ...question,
      image:
        question.image?.dataUrl && question.image?.fileName
          ? {
              dataUrl: question.image.dataUrl,
              fileName: question.image.fileName,
              alt: question.image.alt ?? "",
            }
          : undefined,
      topicId:
        question.topicId &&
        topics.some(
          (topic) =>
            topic.id === question.topicId &&
            topic.categoryId === question.categoryId,
        )
          ? question.topicId
          : (() => {
              const seedTopicId = seedState.questions.find(
                (seedQuestion) => seedQuestion.id === question.id,
              )?.topicId;
              return (
                topics.find((topic) => topic.id === seedTopicId)?.id ??
                topics.find(
                  (topic) => topic.categoryId === question.categoryId,
                )?.id ??
                ""
              );
            })(),
    }),
  );
  const quizzes = (stored.quizzes ?? seedState.quizzes).map((quiz) => ({
    ...quiz,
    passPercentage: quiz.passPercentage ?? 70,
    scoringMode: quiz.scoringMode ?? "combined",
    topicPassPercentages: quiz.topicPassPercentages ?? {},
  }));

  return {
    categories,
    topics,
    questions,
    quizzes,
    exports: stored.exports ?? [],
    examPublications: stored.examPublications ?? [],
    examAttempts: stored.examAttempts ?? [],
    examEvents: stored.examEvents ?? [],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuizState>(seedState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const lastExternalEventRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let nextState: QuizState | null = null;
    try {
      const stored =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) nextState = normalizeState(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (nextState) setState(nextState);
      setReady(true);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let quotaTimer: number | undefined;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      quotaTimer = window.setTimeout(
        () =>
          setToast(
            "Der lokale Speicher ist voll. Entferne grosse Bilder oder synchronisiere mit Supabase.",
          ),
        0,
      );
    }
    return () => {
      if (quotaTimer) window.clearTimeout(quotaTimer);
    };
  }, [ready, state]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3000);
  }, []);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const nextState = normalizeState(JSON.parse(event.newValue));
        setState(nextState);
        const newest = nextState.examEvents[0];
        if (
          newest &&
          newest.id !== lastExternalEventRef.current &&
          (newest.type === "tab-hidden" ||
            newest.type === "fullscreen-exit")
        ) {
          lastExternalEventRef.current = newest.id;
          const attempt = nextState.examAttempts.find(
            (item) => item.id === newest.attemptId,
          );
          showToast(
            `Prüfungswarnung: ${attempt?.name ?? "Teilnehmende Person"} – ${newest.message}`,
          );
        }
      } catch {
        // Ein beschädigter Eintrag in einem anderen Tab wird ignoriert.
      }
    }
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, [showToast]);

  const createQuiz = useCallback(() => {
    const id = makeId("quiz");
    setState((current) => ({
      ...current,
      quizzes: [
        {
          id,
          title: "Neues Quiz",
          description: "",
          categoryId: current.categories[0]?.id ?? "",
          status: "draft",
          questionIds: [],
          passPercentage: 70,
          scoringMode: "combined",
          topicPassPercentages: {},
          updatedAt: new Date().toISOString(),
        },
        ...current.quizzes,
      ],
    }));
    return id;
  }, []);

  const updateQuiz = useCallback((id: string, patch: Partial<Quiz>) => {
    setState((current) => ({
      ...current,
      quizzes: current.quizzes.map((quiz) =>
        quiz.id === id
          ? { ...quiz, ...patch, updatedAt: new Date().toISOString() }
          : quiz,
      ),
    }));
  }, []);

  const deleteQuiz = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      quizzes: current.quizzes.filter((quiz) => quiz.id !== id),
      exports: current.exports.filter((record) => record.quizId !== id),
      examPublications: current.examPublications.map((publication) =>
        publication.quizId === id
          ? { ...publication, active: false }
          : publication,
      ),
    }));
  }, []);

  const createQuestion = useCallback((categoryId?: string, topicId?: string) => {
    const id = makeId("question");
    setState((current) => ({
      ...current,
      questions: [
        ...current.questions,
        {
          id,
          title: "Neue Frage",
          description: "",
          image: undefined,
          type: "single",
          categoryId: categoryId ?? current.categories[0]?.id ?? "",
          topicId:
            topicId ??
            current.topics.find(
              (topic) =>
                topic.categoryId ===
                (categoryId ?? current.categories[0]?.id ?? ""),
            )?.id ??
            "",
          points: 1,
          shuffle: true,
          answers: [
            { id: makeId("answer"), text: "Antwort 1", correct: true },
            { id: makeId("answer"), text: "Antwort 2", correct: false },
          ],
        },
      ],
    }));
    return id;
  }, []);

  const updateQuestion = useCallback(
    (id: string, patch: Partial<Question>) => {
      setState((current) => ({
        ...current,
        questions: current.questions.map((question) =>
          question.id === id ? { ...question, ...patch } : question,
        ),
      }));
    },
    [],
  );

  const deleteQuestion = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.id !== id),
      quizzes: current.quizzes.map((quiz) => ({
        ...quiz,
        questionIds: quiz.questionIds.filter((questionId) => questionId !== id),
      })),
    }));
  }, []);

  const addQuestionToQuiz = useCallback((quizId: string, questionId: string) => {
    setState((current) => ({
      ...current,
      quizzes: current.quizzes.map((quiz) =>
        quiz.id === quizId && !quiz.questionIds.includes(questionId)
          ? {
              ...quiz,
              questionIds: [...quiz.questionIds, questionId],
              updatedAt: new Date().toISOString(),
            }
          : quiz,
      ),
    }));
  }, []);

  const removeQuestionFromQuiz = useCallback(
    (quizId: string, questionId: string) => {
      setState((current) => ({
        ...current,
        quizzes: current.quizzes.map((quiz) =>
          quiz.id === quizId
            ? {
                ...quiz,
                questionIds: quiz.questionIds.filter((id) => id !== questionId),
                updatedAt: new Date().toISOString(),
              }
            : quiz,
        ),
      }));
    },
    [],
  );

  const createCategory = useCallback((name: string) => {
    const id = makeId("category");
    const topicId = makeId("topic");
    setState((current) => ({
      ...current,
      categories: [
        ...current.categories,
        { id, name, color: "#dd6b4d" },
      ],
      topics: [
        ...current.topics,
        { id: topicId, categoryId: id, name: "Allgemein" },
      ],
    }));
    return id;
  }, []);

  const updateCategory = useCallback(
    (id: string, patch: Partial<Category>) => {
      setState((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === id ? { ...category, ...patch } : category,
        ),
      }));
    },
    [],
  );

  const deleteCategory = useCallback((id: string) => {
    setState((current) => {
      if (
        current.questions.some((question) => question.categoryId === id) ||
        current.quizzes.some((quiz) => quiz.categoryId === id)
      ) {
        return current;
      }
      return {
        ...current,
        categories: current.categories.filter(
          (category) => category.id !== id,
        ),
        topics: current.topics.filter((topic) => topic.categoryId !== id),
      };
    });
  }, []);

  const createTopic = useCallback((categoryId: string, name: string) => {
    const id = makeId("topic");
    setState((current) => ({
      ...current,
      topics: [...current.topics, { id, categoryId, name }],
    }));
    return id;
  }, []);

  const updateTopic = useCallback((id: string, patch: Partial<Topic>) => {
    setState((current) => ({
      ...current,
      topics: current.topics.map((topic) =>
        topic.id === id ? { ...topic, ...patch } : topic,
      ),
    }));
  }, []);

  const deleteTopic = useCallback((id: string) => {
    setState((current) => {
      if (current.questions.some((question) => question.topicId === id)) {
        return current;
      }
      return {
        ...current,
        topics: current.topics.filter((topic) => topic.id !== id),
        quizzes: current.quizzes.map((quiz) => {
          const topicPassPercentages = { ...quiz.topicPassPercentages };
          delete topicPassPercentages[id];
          return { ...quiz, topicPassPercentages };
        }),
      };
    });
  }, []);

  const createExamPublication = useCallback(
    (quizId: string) => {
      const id = makeId("exam");
      setState((current) => {
        const quiz = current.quizzes.find((item) => item.id === quizId);
        const slug = `${slugify(quiz?.title ?? "pruefung")}-${crypto
          .randomUUID()
          .slice(0, 6)}`;
        return {
          ...current,
          examPublications: [
            {
              id,
              quizId,
              slug,
              mode: "closed",
              timeLimit: 45,
              maxViolations: 2,
              active: true,
              sendResults: true,
              createdAt: new Date().toISOString(),
            },
            ...current.examPublications,
          ],
        };
      });
      return id;
    },
    [],
  );

  const updateExamPublication = useCallback(
    (id: string, patch: Partial<ExamPublication>) => {
      setState((current) => ({
        ...current,
        examPublications: current.examPublications.map((publication) =>
          publication.id === id ? { ...publication, ...patch } : publication,
        ),
      }));
    },
    [],
  );

  const startExamAttempt = useCallback(
    (publicationId: string, name: string, email: string) => {
      const publication = state.examPublications.find(
        (item) => item.id === publicationId,
      );
      if (!publication?.active) {
        return { error: "Diese Prüfung ist derzeit nicht freigeschaltet." };
      }
      const normalizedEmail = email.trim().toLowerCase();
      const existing = state.examAttempts.find(
        (attempt) =>
          attempt.publicationId === publicationId &&
          attempt.email.toLowerCase() === normalizedEmail &&
          attempt.status !== "reset",
      );
      if (existing) {
        return {
          error:
            existing.status === "in-progress"
              ? "Für diese E-Mail-Adresse läuft bereits ein Versuch."
              : "Für diese E-Mail-Adresse wurde der einzige Versuch bereits verwendet.",
        };
      }

      const attemptId = makeId("attempt");
      const eventId = makeId("event");
      const startedAt = new Date().toISOString();
      const attempt: ExamAttempt = {
        id: attemptId,
        publicationId,
        name: name.trim(),
        email: normalizedEmail,
        status: "in-progress",
        startedAt,
        currentQuestion: 0,
        responses: {},
        score: 0,
        possible: 0,
        percentage: 0,
        passed: false,
        topicResults: [],
        violationCount: 0,
        resultEmailStatus: "pending",
      };
      setState((current) => ({
        ...current,
        examAttempts: [attempt, ...current.examAttempts],
        examEvents: [
          {
            id: eventId,
            publicationId,
            attemptId,
            type: "started",
            message: "Prüfung gestartet",
            createdAt: startedAt,
          },
          ...current.examEvents,
        ],
      }));
      return { attemptId };
    },
    [state.examAttempts, state.examPublications],
  );

  const updateExamAttempt = useCallback(
    (id: string, patch: Partial<ExamAttempt>) => {
      setState((current) => ({
        ...current,
        examAttempts: current.examAttempts.map((attempt) =>
          attempt.id === id ? { ...attempt, ...patch } : attempt,
        ),
      }));
    },
    [],
  );

  const addExamEvent = useCallback(
    (event: Omit<ExamEvent, "id" | "createdAt">) => {
      const id = makeId("event");
      setState((current) => ({
        ...current,
        examEvents: [
          { ...event, id, createdAt: new Date().toISOString() },
          ...current.examEvents,
        ],
      }));
      return id;
    },
    [],
  );

  const resetExamAttempt = useCallback((id: string) => {
    setState((current) => {
      const attempt = current.examAttempts.find((item) => item.id === id);
      if (!attempt) return current;
      const status: ExamAttemptStatus = "reset";
      return {
        ...current,
        examAttempts: current.examAttempts.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
        examEvents: [
          {
            id: makeId("event"),
            publicationId: attempt.publicationId,
            attemptId: attempt.id,
            type: "reset" as ExamEventType,
            message: "Versuch durch Administrator freigegeben",
            createdAt: new Date().toISOString(),
          },
          ...current.examEvents,
        ],
      };
    });
  }, []);

  const importQuestions = useCallback(
    (questions: Question[], categories: Category[]) => {
      setState((current) => {
        const nextCategories = [...current.categories];
        const nextTopics = [...current.topics];
        const categoryMap = new Map<string, string>();
        for (const category of categories) {
          const existing = nextCategories.find(
            (item) => item.name.toLowerCase() === category.name.toLowerCase(),
          );
          if (existing) {
            categoryMap.set(category.id, existing.id);
          } else {
            const categoryId = makeId("category");
            categoryMap.set(category.id, categoryId);
            nextCategories.push({ ...category, id: categoryId });
          }
        }
        const fallbackCategoryId =
          nextCategories[0]?.id ??
          (() => {
            const categoryId = makeId("category");
            nextCategories.push({
              id: categoryId,
              name: "Import",
              color: "#6f8785",
            });
            return categoryId;
          })();
        for (const category of nextCategories) {
          if (!nextTopics.some((topic) => topic.categoryId === category.id)) {
            nextTopics.push({
              id: makeId("topic"),
              categoryId: category.id,
              name: "Allgemein",
            });
          }
        }
        return {
          ...current,
          categories: nextCategories,
          topics: nextTopics,
          questions: [
            ...current.questions,
            ...questions.map((question) => {
              const categoryId =
                categoryMap.get(question.categoryId) ?? fallbackCategoryId;
              return {
                ...question,
                id: makeId("question"),
                categoryId,
                topicId:
                  nextTopics.find((topic) => topic.categoryId === categoryId)
                    ?.id ?? "",
                answers: question.answers.map((answer) => ({
                  ...answer,
                  id: makeId("answer"),
                })),
              };
            }),
          ],
        };
      });
      return questions.length;
    },
    [],
  );

  const recordExport = useCallback(
    (record: Omit<ExportRecord, "id" | "createdAt">) => {
      setState((current) => ({
        ...current,
        exports: [
          {
            ...record,
            id: makeId("export"),
            createdAt: new Date().toISOString(),
          },
          ...current.exports,
        ],
        quizzes: current.quizzes.map((quiz) =>
          quiz.id === record.quizId ? { ...quiz, status: "exported" } : quiz,
        ),
      }));
    },
    [],
  );

  const resetDemo = useCallback(() => {
    setState(seedState);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      ready,
      toast,
      showToast,
      createQuiz,
      updateQuiz,
      deleteQuiz,
      createQuestion,
      updateQuestion,
      deleteQuestion,
      addQuestionToQuiz,
      removeQuestionFromQuiz,
      createCategory,
      updateCategory,
      deleteCategory,
      createTopic,
      updateTopic,
      deleteTopic,
      createExamPublication,
      updateExamPublication,
      startExamAttempt,
      updateExamAttempt,
      addExamEvent,
      resetExamAttempt,
      importQuestions,
      recordExport,
      resetDemo,
    }),
    [
      state,
      ready,
      toast,
      showToast,
      createQuiz,
      updateQuiz,
      deleteQuiz,
      createQuestion,
      updateQuestion,
      deleteQuestion,
      addQuestionToQuiz,
      removeQuestionFromQuiz,
      createCategory,
      updateCategory,
      deleteCategory,
      createTopic,
      updateTopic,
      deleteTopic,
      createExamPublication,
      updateExamPublication,
      startExamAttempt,
      updateExamAttempt,
      addExamEvent,
      resetExamAttempt,
      importQuestions,
      recordExport,
      resetDemo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useQuizApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useQuizApp must be used inside AppProvider");
  return context;
}
