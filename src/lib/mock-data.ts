export type ViewId =
  | "dashboard"
  | "quizzes"
  | "pool"
  | "categories"
  | "import"
  | "export"
  | "preview"
  | "settings";

export type QuestionType =
  | "single"
  | "multiple"
  | "boolean"
  | "text"
  | "order"
  | "match"
  | "scale";

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
  category: string;
  points: number;
  shuffle: boolean;
  answers: Answer[];
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

export const categories = [
  { name: "Excel", questions: 28, quizzes: 3 },
  { name: "Outlook", questions: 14, quizzes: 2 },
  { name: "Teams", questions: 6, quizzes: 1 },
  { name: "Word", questions: 0, quizzes: 0 },
];

export const initialQuestions: Question[] = [
  {
    id: "q-1",
    title: "Was ist eine Zelle?",
    description: "",
    type: "single",
    category: "Excel",
    points: 1,
    shuffle: true,
    answers: [
      { id: "a-1-1", text: "Eine KuhMuh", correct: false },
      { id: "a-1-2", text: "Ein Töff", correct: false },
      {
        id: "a-1-3",
        text: "Die kleinste Einheit in Excel",
        correct: true,
      },
    ],
  },
  {
    id: "q-2",
    title: "Welche Funktionen berechnen einen Durchschnitt?",
    description: "Mehrfachauswahl möglich.",
    type: "multiple",
    category: "Excel",
    points: 2,
    shuffle: true,
    answers: [
      { id: "a-2-1", text: "MITTELWERT", correct: true },
      { id: "a-2-2", text: "AVERAGE", correct: true },
      { id: "a-2-3", text: "SUMME", correct: false },
      { id: "a-2-4", text: "ANZAHL", correct: false },
    ],
  },
  {
    id: "q-3",
    title: "SVERWEIS sucht immer in der ersten Spalte.",
    description: "",
    type: "boolean",
    category: "Excel",
    points: 1,
    shuffle: false,
    answers: [
      { id: "a-3-1", text: "Wahr", correct: true },
      { id: "a-3-2", text: "Falsch", correct: false },
    ],
  },
  {
    id: "q-4",
    title: "Ordne die Schritte des Autofilters.",
    description: "Ziehe die Schritte in die richtige Reihenfolge.",
    type: "order",
    category: "Excel",
    points: 3,
    shuffle: false,
    answers: [
      { id: "a-4-1", text: "Datenbereich markieren", correct: true },
      { id: "a-4-2", text: "Register Daten öffnen", correct: true },
      { id: "a-4-3", text: "Filter aktivieren", correct: true },
      { id: "a-4-4", text: "Kriterium auswählen", correct: true },
    ],
  },
  {
    id: "q-5",
    title: "Welches Zeichen startet jede Formel?",
    description: "",
    type: "text",
    category: "Excel",
    points: 1,
    shuffle: false,
    answers: [{ id: "a-5-1", text: "=", correct: true }],
  },
];

export const recentQuizzes = [
  {
    name: "Excel Grundlagen",
    meta: "12 Fragen · Excel · heute, 14:20",
    status: "Exportiert",
    tone: "success",
  },
  {
    name: "Outlook für Einsteiger",
    meta: "9 Fragen · Outlook · gestern, 09:05",
    status: "Bereit",
    tone: "ready",
  },
  {
    name: "Excel Formeln & Funktionen",
    meta: "15 Fragen · Excel · 24.07.2026",
    status: "Entwurf",
    tone: "draft",
  },
  {
    name: "Teams Basiswissen",
    meta: "7 Fragen · Teams · 22.07.2026",
    status: "Entwurf",
    tone: "draft",
  },
];

export const accessMappings = [
  ["tbl_Produkt.Produkt", "categories.name"],
  ["tbl_Fragen.Frage", "questions.title"],
  ["tbl_Fragen.Beschreibung", "questions.description"],
  ["tbl_Fragen.IDX_ProduktUF", "questions.category_id"],
  ["tbl_Antworten.Antwort", "answers.text"],
  ["tbl_Antworten.RichtigFalsch", "answers.is_correct"],
] as const;
