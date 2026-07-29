"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Eye,
  FileInput,
  FileOutput,
  Folder,
  GripVertical,
  LayoutDashboard,
  ListChecks,
  Menu,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/section-header";
import { ExportView, ImportView } from "@/components/transfer-views";
import {
  categories,
  initialQuestions,
  questionTypeLabels,
  recentQuizzes,
} from "@/lib/mock-data";
import type {
  Answer,
  Question,
  QuestionType,
  ViewId,
} from "@/lib/mock-data";

type NavItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
};

const mainNav: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "quizzes", label: "Quizzes", icon: ListChecks },
  { id: "pool", label: "Fragenpool", icon: CircleHelp },
  { id: "categories", label: "Kategorien", icon: Folder },
];

const transferNav: NavItem[] = [
  { id: "import", label: "Import", icon: FileInput },
  { id: "export", label: "Export", icon: FileOutput },
  { id: "preview", label: "Vorschau", icon: Eye },
];

function StatCard({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <article className="aq-card aq-stat">
      <span className="aq-stat-icon">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function Sidebar({
  activeView,
  open,
  onNavigate,
}: {
  activeView: ViewId;
  open: boolean;
  onNavigate: (view: ViewId) => void;
}) {
  const renderNav = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <button
        className="aq-nav-button"
        data-active={activeView === item.id}
        key={item.id}
        onClick={() => onNavigate(item.id)}
        type="button"
      >
        <Icon aria-hidden="true" />
        {item.label}
      </button>
    );
  };

  return (
    <aside className="aq-sidebar" data-open={open}>
      <div className="aq-brand">
        <div className="aq-brand-mark">A</div>
        <div>
          <strong className="aq-brand-name">
            ALPHAQUIZ<span>.</span>
          </strong>
          <span className="aq-brand-subtitle">QUIZ-MANAGER</span>
        </div>
      </div>

      <nav className="aq-nav" aria-label="Hauptnavigation">
        {mainNav.map(renderNav)}
        <hr className="aq-nav-divider" />
        {transferNav.map(renderNav)}
        <hr className="aq-nav-divider" />
        {renderNav({ id: "settings", label: "Einstellungen", icon: Settings })}
      </nav>

      <div className="aq-sidebar-footer">
        <div className="aq-profile">
          <span className="aq-avatar">L</span>
          <div>
            <strong>Luca</strong>
            <span>Administrator · Mockup</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Übersicht"
        title="Guten Tag, Luca."
        lead="Deine Quizzes, Fragen und Exporte auf einen Blick."
      >
        <button
          className="aq-button"
          onClick={() => onNavigate("import")}
          type="button"
        >
          <Upload aria-hidden="true" />
          Datei importieren
        </button>
        <button
          className="aq-button aq-button-primary"
          onClick={() => onNavigate("quizzes")}
          type="button"
        >
          <Plus aria-hidden="true" />
          Quiz erstellen
        </button>
      </PageHeader>

      <section className="aq-stat-grid" aria-label="Kennzahlen">
        <StatCard icon={ListChecks} label="Quizzes" value="6" />
        <StatCard icon={CircleHelp} label="Fragen im Pool" value="48" />
        <StatCard icon={Folder} label="Kategorien" value="4" />
        <StatCard icon={FileOutput} label="Exporte" value="11" />
      </section>

      <section className="aq-dashboard-grid">
        <article className="aq-card">
          <div className="aq-card-header">
            <div>
              <p className="aq-eyebrow">Zuletzt bearbeitet</p>
              <h2>Quizzes</h2>
            </div>
            <button
              className="aq-button aq-button-quiet"
              onClick={() => onNavigate("quizzes")}
              type="button"
            >
              Alle anzeigen <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <div>
            {recentQuizzes.map((quiz) => (
              <div className="aq-list-row" key={quiz.name}>
                <div className="aq-list-main">
                  <strong>{quiz.name}</strong>
                  <span>{quiz.meta}</span>
                </div>
                <span className="aq-pill" data-tone={quiz.tone}>
                  {quiz.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="aq-card">
          <div className="aq-card-header">
            <div>
              <p className="aq-eyebrow">Neu erzeugt</p>
              <h2>Exporte</h2>
            </div>
            <button
              className="aq-button aq-button-quiet"
              onClick={() => onNavigate("export")}
              type="button"
            >
              Alle <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <div>
            {[
              ["DOCX", "Excel_Grundlagen.docx", "Forms-Import · heute"],
              ["XLSX", "Excel_Grundlagen.xlsx", "Fragenliste · heute"],
              ["JSON", "outlook_einsteiger.json", "Sicherung · gestern"],
            ].map(([type, name, meta]) => (
              <div className="aq-list-row" key={name}>
                <span className="aq-filetype">{type}</span>
                <div className="aq-list-main">
                  <strong>{name}</strong>
                  <span>{meta}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function QuizEditorView({
  questions,
  activeQuestionId,
  savedState,
  onActiveQuestion,
  onQuestions,
  onPreview,
  onExport,
  onSave,
  onToast,
}: {
  questions: Question[];
  activeQuestionId: string;
  savedState: string;
  onActiveQuestion: (id: string) => void;
  onQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  onPreview: () => void;
  onExport: () => void;
  onSave: () => void;
  onToast: (message: string) => void;
}) {
  const activeQuestion =
    questions.find((question) => question.id === activeQuestionId) ?? questions[0];

  const updateQuestion = (patch: Partial<Question>) => {
    onQuestions((current) =>
      current.map((question) =>
        question.id === activeQuestion.id ? { ...question, ...patch } : question,
      ),
    );
  };

  const updateAnswer = (answerId: string, patch: Partial<Answer>) => {
    updateQuestion({
      answers: activeQuestion.answers.map((answer) =>
        answer.id === answerId ? { ...answer, ...patch } : answer,
      ),
    });
  };

  const selectQuestionType = (type: QuestionType) => {
    let answers = activeQuestion.answers;
    if (type === "boolean") {
      answers = [
        { id: `${activeQuestion.id}-true`, text: "Wahr", correct: true },
        { id: `${activeQuestion.id}-false`, text: "Falsch", correct: false },
      ];
    } else if (type === "text" && answers.length !== 1) {
      answers = [
        {
          id: `${activeQuestion.id}-text`,
          text: "Musterantwort",
          correct: true,
        },
      ];
    } else if (type !== "text" && answers.length < 2) {
      answers = [
        ...answers,
        {
          id: `${activeQuestion.id}-option-${answers.length + 1}`,
          text: "Neue Antwort",
          correct: false,
        },
      ];
    }
    if (type === "single") {
      const firstCorrect = answers.findIndex((answer) => answer.correct);
      answers = answers.map((answer, index) => ({
        ...answer,
        correct: index === (firstCorrect >= 0 ? firstCorrect : 0),
      }));
    }
    updateQuestion({ type, answers });
  };

  const toggleCorrect = (answerId: string) => {
    const singleCorrect =
      activeQuestion.type === "single" || activeQuestion.type === "boolean";
    updateQuestion({
      answers: activeQuestion.answers.map((answer) => ({
        ...answer,
        correct:
          answer.id === answerId
            ? singleCorrect
              ? true
              : !answer.correct
            : singleCorrect
              ? false
              : answer.correct,
      })),
    });
  };

  const addAnswer = () => {
    updateQuestion({
      answers: [
        ...activeQuestion.answers,
        {
          id: `${activeQuestion.id}-answer-${activeQuestion.answers.length + 1}`,
          text: "",
          correct: false,
        },
      ],
    });
  };

  const removeAnswer = (answerId: string) => {
    if (activeQuestion.answers.length <= 2 && activeQuestion.type !== "text") {
      onToast("Mindestens zwei Antworten bleiben erhalten.");
      return;
    }
    updateQuestion({
      answers: activeQuestion.answers.filter((answer) => answer.id !== answerId),
    });
  };

  const addQuestion = () => {
    const id = `q-local-${questions.length + 1}`;
    const nextQuestion: Question = {
      id,
      title: "Neue Frage",
      description: "",
      type: "single",
      category: "Excel",
      points: 1,
      shuffle: true,
      answers: [
        { id: `${id}-1`, text: "Antwort 1", correct: true },
        { id: `${id}-2`, text: "Antwort 2", correct: false },
      ],
    };
    onQuestions((current) => [...current, nextQuestion]);
    onActiveQuestion(id);
  };

  return (
    <>
      <PageHeader
        eyebrow="Quiz bearbeiten"
        title="Excel Grundlagen"
        lead={`${questions.length} Fragen · Kategorie Excel · ${savedState}`}
      >
        <button className="aq-button" onClick={onPreview} type="button">
          <Eye aria-hidden="true" />
          Vorschau
        </button>
        <button className="aq-button" onClick={onSave} type="button">
          <Save aria-hidden="true" />
          Speichern
        </button>
        <button
          className="aq-button aq-button-primary"
          onClick={onExport}
          type="button"
        >
          <FileOutput aria-hidden="true" />
          Exportieren
        </button>
      </PageHeader>

      <section className="aq-editor-grid">
        <aside className="aq-card aq-question-list" aria-label="Fragen im Quiz">
          {questions.map((question, index) => (
            <button
              className="aq-question-item"
              data-active={question.id === activeQuestion.id}
              key={question.id}
              onClick={() => onActiveQuestion(question.id)}
              type="button"
            >
              <span className="aq-question-number">{index + 1}</span>
              <span className="aq-question-copy">
                <strong>{question.title || "Unbenannte Frage"}</strong>
                <span>
                  {questionTypeLabels[question.type]} · {question.points} P.
                </span>
              </span>
            </button>
          ))}
          <button className="aq-add-question" onClick={addQuestion} type="button">
            <Plus aria-hidden="true" size={14} />
            Frage hinzufügen
          </button>
        </aside>

        <article className="aq-card aq-editor-card">
          <div className="aq-editor-toolbar">
            <strong>Frage {questions.indexOf(activeQuestion) + 1}</strong>
            <span className="aq-save-state">
              <i />
              Änderungen nur im Mockup
            </span>
          </div>

          <div className="aq-editor-body">
            <div className="aq-field">
              <label className="aq-field-label">Antwortformat</label>
              <div className="aq-format-grid">
                {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
                  <button
                    aria-pressed={activeQuestion.type === type}
                    className="aq-format-button"
                    data-active={activeQuestion.type === type}
                    key={type}
                    onClick={() => selectQuestionType(type)}
                    type="button"
                  >
                    {questionTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            <div className="aq-field">
              <label className="aq-field-label" htmlFor="question-title">
                Frage
              </label>
              <input
                className="aq-input"
                id="question-title"
                onChange={(event) => updateQuestion({ title: event.target.value })}
                value={activeQuestion.title}
              />
            </div>

            <div className="aq-field">
              <label className="aq-field-label" htmlFor="question-description">
                Beschreibung <span>optional</span>
              </label>
              <textarea
                className="aq-input"
                id="question-description"
                onChange={(event) =>
                  updateQuestion({ description: event.target.value })
                }
                placeholder="Hinweis für die Teilnehmenden"
                value={activeQuestion.description}
              />
            </div>

            <div className="aq-field">
              <label className="aq-field-label">
                {activeQuestion.type === "order"
                  ? "Elemente · richtige Reihenfolge"
                  : activeQuestion.type === "text"
                    ? "Musterantwort"
                    : "Antworten · richtige markieren"}
              </label>
              {activeQuestion.answers.map((answer) => (
                <div
                  className="aq-answer"
                  data-correct={answer.correct}
                  key={answer.id}
                >
                  {activeQuestion.type === "order" ? (
                    <GripVertical aria-hidden="true" size={16} color="#817f79" />
                  ) : (
                    <button
                      aria-label={
                        answer.correct
                          ? "Als falsch markieren"
                          : "Als richtig markieren"
                      }
                      className="aq-answer-correct"
                      onClick={() => toggleCorrect(answer.id)}
                      type="button"
                    >
                      <Check aria-hidden="true" />
                    </button>
                  )}
                  <input
                    aria-label="Antworttext"
                    onChange={(event) =>
                      updateAnswer(answer.id, { text: event.target.value })
                    }
                    value={answer.text}
                  />
                  <button
                    aria-label="Antwort löschen"
                    className="aq-icon-button"
                    onClick={() => removeAnswer(answer.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ))}
              {activeQuestion.type !== "boolean" ? (
                <button className="aq-add-question" onClick={addAnswer} type="button">
                  <Plus aria-hidden="true" size={14} />
                  Antwort hinzufügen
                </button>
              ) : null}
            </div>

            <div className="aq-field-row">
              <div>
                <label className="aq-field-label" htmlFor="question-category">
                  Kategorie
                </label>
                <select
                  className="aq-input"
                  id="question-category"
                  onChange={(event) =>
                    updateQuestion({ category: event.target.value })
                  }
                  value={activeQuestion.category}
                >
                  {categories.map((category) => (
                    <option key={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="aq-field-label" htmlFor="question-points">
                  Punkte
                </label>
                <input
                  className="aq-input"
                  id="question-points"
                  min="0"
                  onChange={(event) =>
                    updateQuestion({
                      points: Math.max(0, Number(event.target.value)),
                    })
                  }
                  type="number"
                  value={activeQuestion.points}
                />
              </div>
              <div>
                <label className="aq-field-label" htmlFor="question-shuffle">
                  Mischen
                </label>
                <select
                  className="aq-input"
                  id="question-shuffle"
                  onChange={(event) =>
                    updateQuestion({ shuffle: event.target.value === "yes" })
                  }
                  value={activeQuestion.shuffle ? "yes" : "no"}
                >
                  <option value="yes">Ja</option>
                  <option value="no">Nein</option>
                </select>
              </div>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function PoolView({
  questions,
  onEdit,
}: {
  questions: Question[];
  onEdit: (questionId: string) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Fragenpool"
        title="Alle Fragen."
        lead="Eine zentrale Sammlung – dieselbe Frage kann später in mehreren Quizzes verwendet werden."
      >
        <button
          className="aq-button aq-button-primary"
          onClick={() => onEdit(questions[0].id)}
          type="button"
        >
          <Plus aria-hidden="true" />
          Frage erfassen
        </button>
      </PageHeader>
      <section className="aq-card">
        {questions.map((question) => (
          <button
            className="aq-export-option"
            key={question.id}
            onClick={() => onEdit(question.id)}
            type="button"
          >
            <span className="aq-category-mark">{question.category[0]}</span>
            <span className="aq-list-main">
              <strong>{question.title}</strong>
              <span>
                {questionTypeLabels[question.type]} · {question.answers.length}{" "}
                Antworten · {question.points} Punkte
              </span>
            </span>
            <span className="aq-pill">{question.category}</span>
          </button>
        ))}
      </section>
    </>
  );
}

function CategoriesView({ onToast }: { onToast: (message: string) => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Kategorien"
        title="Themen ordnen."
        lead="Entspricht der Tabelle tbl_Produkt aus deiner Access-Datei."
      >
        <button
          className="aq-button aq-button-primary"
          onClick={() => onToast("Kategorie-Dialog im Mockup geöffnet.")}
          type="button"
        >
          <Plus aria-hidden="true" />
          Kategorie anlegen
        </button>
      </PageHeader>
      <section className="aq-card">
        {categories.map((category) => (
          <div className="aq-list-row" key={category.name}>
            <span className="aq-category-mark">{category.name[0]}</span>
            <div className="aq-list-main">
              <strong>{category.name}</strong>
              <span>
                {category.questions} Fragen ·{" "}
                {category.quizzes === 0
                  ? "noch kein Quiz"
                  : `${category.quizzes} Quizzes`}
              </span>
            </div>
            <button
              className="aq-button aq-button-quiet"
              onClick={() => onToast(`${category.name} kann jetzt bearbeitet werden.`)}
              type="button"
            >
              Bearbeiten
            </button>
          </div>
        ))}
      </section>
    </>
  );
}

function PreviewView({
  questions,
  onEdit,
}: {
  questions: Question[];
  onEdit: () => void;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const question = questions[questionIndex];
  const selected = selections[question.id] ?? [];
  const supportsOptions = question.type !== "text";

  const selectAnswer = (answerId: string) => {
    const multi = question.type === "multiple";
    setSelections((current) => {
      const existing = current[question.id] ?? [];
      const next = multi
        ? existing.includes(answerId)
          ? existing.filter((id) => id !== answerId)
          : [...existing, answerId]
        : [answerId];
      return { ...current, [question.id]: next };
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Teilnehmenden-Vorschau"
        title="Excel Grundlagen"
        lead="So fühlt sich das Quiz später für Teilnehmende an."
      >
        <button className="aq-button" onClick={onEdit} type="button">
          <ArrowLeft aria-hidden="true" />
          Bearbeiten
        </button>
      </PageHeader>

      <section className="aq-card aq-play-shell">
        <div className="aq-play-top">
          <div className="aq-progress-track" aria-label="Quiz-Fortschritt">
            <div
              className="aq-progress-value"
              style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span>
            {questionIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="aq-play-body">
          <p className="aq-play-kicker">
            {questionTypeLabels[question.type]} · {question.points}{" "}
            {question.points === 1 ? "Punkt" : "Punkte"}
          </p>
          <h2 className="aq-play-question">{question.title}</h2>
          <p className="aq-play-description">
            {question.description ||
              (question.type === "multiple"
                ? "Mehrere Antworten können richtig sein."
                : "Wähle die passende Antwort.")}
          </p>

          {supportsOptions ? (
            question.answers.map((answer, index) => (
              <button
                aria-pressed={selected.includes(answer.id)}
                className="aq-preview-option"
                data-selected={selected.includes(answer.id)}
                key={answer.id}
                onClick={() => selectAnswer(answer.id)}
                type="button"
              >
                <span className="aq-preview-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                {answer.text}
              </button>
            ))
          ) : (
            <textarea
              className="aq-input aq-preview-text"
              placeholder="Antwort eingeben …"
            />
          )}

          <div className="aq-play-actions">
            <button
              className="aq-button"
              disabled={questionIndex === 0}
              onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
              type="button"
            >
              <ArrowLeft aria-hidden="true" />
              Zurück
            </button>
            <button
              className="aq-button aq-button-primary"
              onClick={() =>
                setQuestionIndex((index) =>
                  Math.min(questions.length - 1, index + 1),
                )
              }
              type="button"
            >
              {questionIndex === questions.length - 1 ? "Abschliessen" : "Weiter"}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function SettingsView({ onToast }: { onToast: (message: string) => void }) {
  return (
    <>
      <PageHeader
        eyebrow="Einstellungen"
        title="Verbindungen."
        lead="Im nächsten Schritt werden Supabase, Authentifizierung und Exportdienste verbunden."
      />
      <section className="aq-card">
        <div className="aq-list-row">
          <span className="aq-category-mark">S</span>
          <div className="aq-list-main">
            <strong>Supabase</strong>
            <span>Noch nicht verbunden · im Mockup absichtlich deaktiviert</span>
          </div>
          <span className="aq-pill" data-tone="draft">
            Offen
          </span>
        </div>
        <div className="aq-list-row">
          <span className="aq-category-mark">F</span>
          <div className="aq-list-main">
            <strong>Microsoft Forms Export</strong>
            <span>Word/PDF-Generator und Testimport folgen nach Freigabe</span>
          </div>
          <button
            className="aq-button aq-button-quiet"
            onClick={() => onToast("Export-Test wurde für Phase 2 vorgemerkt.")}
            type="button"
          >
            Planen
          </button>
        </div>
      </section>
    </>
  );
}

export default function AlphaQuizApp() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [activeQuestionId, setActiveQuestionId] = useState("q-2");
  const [savedState, setSavedState] = useState("zuletzt gespeichert vor 3 Minuten");
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const navigate = (view: ViewId) => {
    setActiveView(view);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editQuestion = (questionId: string) => {
    setActiveQuestionId(questionId);
    navigate("quizzes");
  };

  const saveQuiz = () => {
    setSavedState("gerade eben gespeichert");
    showToast("Quiz wurde im Mockup gespeichert.");
  };

  return (
    <div className="aq-app">
      <div className="aq-mobile-bar">
        <div className="aq-brand">
          <div className="aq-brand-mark">A</div>
          <strong className="aq-brand-name">
            ALPHAQUIZ<span>.</span>
          </strong>
        </div>
        <button
          aria-label={mobileOpen ? "Navigation schliessen" : "Navigation öffnen"}
          className="aq-mobile-menu"
          onClick={() => setMobileOpen((open) => !open)}
          type="button"
        >
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <Sidebar
        activeView={activeView}
        onNavigate={navigate}
        open={mobileOpen}
      />
      {mobileOpen ? (
        <button
          aria-label="Navigation schliessen"
          className="aq-mobile-shade"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <main className="aq-main">
        {activeView === "dashboard" ? (
          <DashboardView onNavigate={navigate} />
        ) : null}
        {activeView === "quizzes" ? (
          <QuizEditorView
            activeQuestionId={activeQuestionId}
            onActiveQuestion={setActiveQuestionId}
            onExport={() => navigate("export")}
            onPreview={() => navigate("preview")}
            onQuestions={setQuestions}
            onSave={saveQuiz}
            onToast={showToast}
            questions={questions}
            savedState={savedState}
          />
        ) : null}
        {activeView === "pool" ? (
          <PoolView onEdit={editQuestion} questions={questions} />
        ) : null}
        {activeView === "categories" ? (
          <CategoriesView onToast={showToast} />
        ) : null}
        {activeView === "import" ? <ImportView onToast={showToast} /> : null}
        {activeView === "export" ? (
          <ExportView onToast={showToast} questions={questions} />
        ) : null}
        {activeView === "preview" ? (
          <PreviewView onEdit={() => navigate("quizzes")} questions={questions} />
        ) : null}
        {activeView === "settings" ? (
          <SettingsView onToast={showToast} />
        ) : null}
      </main>

      {toast ? (
        <div className="aq-toast" role="status">
          <CheckCircle2 aria-hidden="true" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
