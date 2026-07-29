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
  ExportRecord,
  Question,
  Quiz,
  QuizState,
} from "@/lib/quiz-types";

const STORAGE_KEY = "alphaquiz-state-v1";

type AppContextValue = {
  state: QuizState;
  ready: boolean;
  toast: string;
  showToast: (message: string) => void;
  createQuiz: () => string;
  updateQuiz: (id: string, patch: Partial<Quiz>) => void;
  deleteQuiz: (id: string) => void;
  createQuestion: (categoryId?: string) => string;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  addQuestionToQuiz: (quizId: string, questionId: string) => void;
  removeQuestionFromQuiz: (quizId: string, questionId: string) => void;
  createCategory: (name: string) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  importQuestions: (questions: Question[], categories: Category[]) => number;
  recordExport: (record: Omit<ExportRecord, "id" | "createdAt">) => void;
  resetDemo: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuizState>(seedState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let nextState: QuizState | null = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) nextState = JSON.parse(stored) as QuizState;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
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
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3000);
  }, []);

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
    }));
  }, []);

  const createQuestion = useCallback((categoryId?: string) => {
    const id = makeId("question");
    setState((current) => ({
      ...current,
      questions: [
        ...current.questions,
        {
          id,
          title: "Neue Frage",
          description: "",
          type: "single",
          categoryId: categoryId ?? current.categories[0]?.id ?? "",
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
    setState((current) => ({
      ...current,
      categories: [
        ...current.categories,
        { id, name, color: "#dd6b4d" },
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
      };
    });
  }, []);

  const importQuestions = useCallback(
    (questions: Question[], categories: Category[]) => {
      setState((current) => {
        const nextCategories = [...current.categories];
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
        return {
          ...current,
          categories: nextCategories,
          questions: [
            ...current.questions,
            ...questions.map((question) => ({
              ...question,
              id: makeId("question"),
              categoryId:
                categoryMap.get(question.categoryId) ?? fallbackCategoryId,
              answers: question.answers.map((answer) => ({
                ...answer,
                id: makeId("answer"),
              })),
            })),
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
