"use client";

import { defaultExamRandomizationConfig } from "@/lib/exam-randomization";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearLocalAdminState,
  useAdminStateSync,
} from "@/hooks/use-admin-state-sync";
import {
  deleteExamPublicationFromState,
  deleteQuestionFromState,
  deleteQuizFromState,
} from "@/lib/quiz-state-mutations";
import { emptyQuizState, seedState } from "@/lib/seed-data";
import type {
  Category,
  ExamAttempt,
  ExamAttemptStatus,
  ExamEventType,
  ExamPublication,
  ExportRecord,
  Question,
  Quiz,
  QuizState,
  Topic,
} from "@/lib/quiz-types";

type AppContextValue = {
  state: QuizState;
  ready: boolean;
  connected: boolean;
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
  deleteExamPublication: (id: string) => void;
  updateExamAttempt: (id: string, patch: Partial<ExamAttempt>) => void;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuizState>(emptyQuizState);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3000);
  }, []);

  const { connected, ready } = useAdminStateSync(
    state,
    setState,
    showToast,
  );

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
          hiddenTopicIds: [],
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
    setState((current) => deleteQuizFromState(current, id));
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
    setState((current) => deleteQuestionFromState(current, id));
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
          .replace(/-/g, "")
          .slice(0, 24)}`;
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
              randomization: defaultExamRandomizationConfig(),
              availableFrom: "",
              availableUntil: "",
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

  const deleteExamPublication = useCallback((id: string) => {
    setState((current) => deleteExamPublicationFromState(current, id));
    void fetch(
      `/api/admin/exam-publications/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ).then(async (response) => {
      if (response.ok) return;
      const data = (await response.json()) as { error?: string };
      setToast(data.error ?? "Die Prüfung konnte nicht gelöscht werden.");
    });
  }, []);

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
    void fetch(`/api/admin/exam-attempts/${id}/reset`, {
      method: "POST",
    }).then(async (response) => {
      if (response.ok) return;
      const data = (await response.json()) as { error?: string };
      setToast(data.error ?? "Der Versuch konnte nicht freigegeben werden.");
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
    clearLocalAdminState();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      ready,
      connected,
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
      deleteExamPublication,
      updateExamAttempt,
      resetExamAttempt,
      importQuestions,
      recordExport,
      resetDemo,
    }),
    [
      state,
      ready,
      connected,
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
      deleteExamPublication,
      updateExamAttempt,
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
