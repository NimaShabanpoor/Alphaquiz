export type QuestionType =
  | "single"
  | "multiple"
  | "boolean"
  | "text"
  | "order"
  | "match"
  | "scale";

export type QuizStatus = "draft" | "ready" | "exported";

export type Answer = {
  id: string;
  text: string;
  correct: boolean;
};

export type Question = {
  id: string;
  title: string;
  description: string;
  type: QuestionType;
  categoryId: string;
  topicId: string;
  points: number;
  shuffle: boolean;
  answers: Answer[];
};

export type ScoringMode = "combined" | "per-topic";

export type Quiz = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  status: QuizStatus;
  questionIds: string[];
  passPercentage: number;
  scoringMode: ScoringMode;
  topicPassPercentages: Record<string, number>;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Topic = {
  id: string;
  categoryId: string;
  name: string;
};

export type ExportRecord = {
  id: string;
  quizId: string;
  format: string;
  fileName: string;
  createdAt: string;
};

export type QuizState = {
  quizzes: Quiz[];
  questions: Question[];
  categories: Category[];
  topics: Topic[];
  exports: ExportRecord[];
};

export const scoringModeLabels: Record<ScoringMode, string> = {
  combined: "Gesamtpunktzahl",
  "per-topic": "Jedes Thema bestehen",
};

export const questionTypeLabels: Record<QuestionType, string> = {
  single: "Single Choice",
  multiple: "Multiple Choice",
  boolean: "Wahr / Falsch",
  text: "Textantwort",
  order: "Reihenfolge",
  match: "Zuordnung",
  scale: "Skala",
};

export const statusLabels: Record<QuizStatus, string> = {
  draft: "Entwurf",
  ready: "Bereit",
  exported: "Exportiert",
};
