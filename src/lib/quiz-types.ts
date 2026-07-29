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

export type QuestionImage = {
  dataUrl: string;
  fileName: string;
  alt: string;
};

export type Question = {
  id: string;
  title: string;
  description: string;
  image?: QuestionImage;
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
  hiddenTopicIds: string[];
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

export type ExamMode = "closed" | "open-book";
export type ExamAttemptStatus =
  | "in-progress"
  | "submitted"
  | "terminated"
  | "reset";
export type ExamEventType =
  | "started"
  | "tab-hidden"
  | "fullscreen-exit"
  | "submitted"
  | "terminated"
  | "reset";

export type ExamPublication = {
  id: string;
  quizId: string;
  slug: string;
  mode: ExamMode;
  timeLimit: number;
  maxViolations: number;
  active: boolean;
  sendResults: boolean;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
};

export type ExamTopicResult = {
  topicId: string;
  name: string;
  score: number;
  possible: number;
  percentage: number;
  required: number;
  passed: boolean;
};

export type ExamAttempt = {
  id: string;
  publicationId: string;
  name: string;
  email: string;
  status: ExamAttemptStatus;
  startedAt: string;
  submittedAt?: string;
  currentQuestion: number;
  responses: Record<string, string[]>;
  score: number;
  possible: number;
  percentage: number;
  passed: boolean;
  topicResults: ExamTopicResult[];
  violationCount: number;
  resultEmailStatus: "pending" | "sent" | "not-configured" | "failed";
};

export type ExamEvent = {
  id: string;
  publicationId: string;
  attemptId: string;
  type: ExamEventType;
  message: string;
  createdAt: string;
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
  examPublications: ExamPublication[];
  examAttempts: ExamAttempt[];
  examEvents: ExamEvent[];
};

export const scoringModeLabels: Record<ScoringMode, string> = {
  combined: "Gesamtpunktzahl",
  "per-topic": "Jedes Thema bestehen",
};

export const QUIZ_UNASSIGNED_TOPIC_ID = "__quiz-unassigned";

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
