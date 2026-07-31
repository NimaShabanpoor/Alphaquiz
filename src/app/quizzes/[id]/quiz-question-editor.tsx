import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { QuestionImageField } from "@/components/question-image-field";
import { EmptyState, ui } from "@/components/ui";
import type {
  Answer,
  Category,
  Question,
  QuestionType,
  Topic,
} from "@/lib/quiz-types";
import { questionTypeLabels } from "@/lib/quiz-types";
import styles from "./page.module.css";

type QuizQuestionEditorProps = {
  activeQuestion?: Question;
  categories: Category[];
  questionNumber: number;
  topics: Topic[];
  onOpenPool: () => void;
  onRemove: (questionId: string) => void;
  onToast: (message: string) => void;
  onUpdate: (questionId: string, patch: Partial<Question>) => void;
};

function normalizeAnswers(question: Question, type: QuestionType): Answer[] {
  if (type === "boolean") {
    return [
      { id: `${question.id}-true`, text: "Wahr", correct: true },
      { id: `${question.id}-false`, text: "Falsch", correct: false },
    ];
  }
  if (type === "text") {
    return [
      question.answers[0] ?? {
        id: `${question.id}-text`,
        text: "",
        correct: true,
      },
    ];
  }
  const answers =
    question.answers.length >= 2
      ? question.answers
      : [
          ...question.answers,
          {
            id: `${question.id}-answer-2`,
            text: "Antwort 2",
            correct: false,
          },
        ];
  if (type === "single") {
    const correctIndex = Math.max(
      0,
      answers.findIndex((answer) => answer.correct),
    );
    return answers.map((answer, index) => ({
      ...answer,
      correct: index === correctIndex,
    }));
  }
  return answers;
}

export function QuizQuestionEditor({
  activeQuestion,
  categories,
  questionNumber,
  topics,
  onOpenPool,
  onRemove,
  onToast,
  onUpdate,
}: QuizQuestionEditorProps) {
  if (!activeQuestion) {
    return (
      <article className={`${ui.card} ${styles.editor}`}>
        <EmptyState
          action={
            <button
              className={`${ui.button} ${ui.primary}`}
              onClick={onOpenPool}
              type="button"
            >
              <Plus aria-hidden="true" /> Erste Frage hinzufügen
            </button>
          }
          icon={Plus}
          text="Füge eine bestehende oder neue Frage hinzu."
          title="Dieses Quiz ist noch leer"
        />
      </article>
    );
  }

  const patchQuestion = (patch: Partial<Question>) =>
    onUpdate(activeQuestion.id, patch);
  const updateAnswer = (answerId: string, patch: Partial<Answer>) =>
    patchQuestion({
      answers: activeQuestion.answers.map((answer) =>
        answer.id === answerId ? { ...answer, ...patch } : answer,
      ),
    });

  function toggleCorrect(answerId: string) {
    if (!activeQuestion) return;
    const onlyOne =
      activeQuestion.type === "single" || activeQuestion.type === "boolean";
    patchQuestion({
      answers: activeQuestion.answers.map((answer) => ({
        ...answer,
        correct:
          answer.id === answerId
            ? onlyOne
              ? true
              : !answer.correct
            : onlyOne
              ? false
              : answer.correct,
      })),
    });
  }

  return (
    <article className={`${ui.card} ${styles.editor}`}>
      <div className={styles.editorTop}>
        <strong>Frage {questionNumber}</strong>
        <button
          className={`${ui.button} ${ui.quiet} ${ui.danger}`}
          onClick={() => {
            onRemove(activeQuestion.id);
            onToast(
              "Frage wurde aus dem Quiz entfernt und bleibt im Fragenpool.",
            );
          }}
          type="button"
        >
          <Trash2 aria-hidden="true" /> Entfernen
        </button>
      </div>
      <div className={styles.editorBody}>
        <div className={ui.field}>
          <label>Antwortformat</label>
          <div className={styles.formats}>
            {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
              <button
                aria-pressed={activeQuestion.type === type}
                data-active={activeQuestion.type === type}
                key={type}
                onClick={() =>
                  patchQuestion({
                    type,
                    answers: normalizeAnswers(activeQuestion, type),
                  })
                }
                type="button"
              >
                {questionTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <label className={ui.field}>
          <span>Frage</span>
          <input
            className={ui.input}
            onChange={(event) => patchQuestion({ title: event.target.value })}
            value={activeQuestion.title}
          />
        </label>

        <label className={ui.field}>
          <span>Beschreibung (optional)</span>
          <textarea
            className={`${ui.input} ${styles.textarea}`}
            onChange={(event) =>
              patchQuestion({ description: event.target.value })
            }
            value={activeQuestion.description}
          />
        </label>

        <QuestionImageField
          image={activeQuestion.image}
          onChange={(image) => patchQuestion({ image })}
          onError={onToast}
        />

        <div className={ui.field}>
          <label>
            {activeQuestion.type === "order"
              ? "Elemente in richtiger Reihenfolge"
              : activeQuestion.type === "text"
                ? "Musterantwort"
                : "Antworten · richtige markieren"}
          </label>
          <div className={styles.answers}>
            {activeQuestion.answers.map((answer) => (
              <div
                className={styles.answer}
                data-correct={answer.correct}
                key={answer.id}
              >
                {activeQuestion.type === "order" ? (
                  <GripVertical aria-hidden="true" />
                ) : (
                  <button
                    aria-label="Richtige Antwort umschalten"
                    className={styles.correct}
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
                {activeQuestion.type !== "boolean" &&
                activeQuestion.answers.length > 1 ? (
                  <button
                    aria-label="Antwort löschen"
                    className={styles.answerDelete}
                    onClick={() =>
                      patchQuestion({
                        answers: activeQuestion.answers.filter(
                          (item) => item.id !== answer.id,
                        ),
                      })
                    }
                    type="button"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {activeQuestion.type !== "boolean" ? (
            <button
              className={styles.addQuestion}
              onClick={() =>
                patchQuestion({
                  answers: [
                    ...activeQuestion.answers,
                    {
                      id: `answer-${crypto.randomUUID()}`,
                      text: "",
                      correct: false,
                    },
                  ],
                })
              }
              type="button"
            >
              <Plus aria-hidden="true" /> Antwort hinzufügen
            </button>
          ) : null}
        </div>

        <div className={styles.fieldRow}>
          <label className={ui.field}>
            <span>Kategorie</span>
            <select
              className={ui.input}
              onChange={(event) => {
                const nextCategoryId = event.target.value;
                patchQuestion({
                  categoryId: nextCategoryId,
                  topicId:
                    topics.find(
                      (topic) => topic.categoryId === nextCategoryId,
                    )?.id ?? "",
                });
              }}
              value={activeQuestion.categoryId}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            <span>Unterthema</span>
            <select
              className={ui.input}
              onChange={(event) =>
                patchQuestion({ topicId: event.target.value })
              }
              value={activeQuestion.topicId}
            >
              {topics
                .filter(
                  (topic) => topic.categoryId === activeQuestion.categoryId,
                )
                .map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
            </select>
          </label>
          <label className={ui.field}>
            <span>Punkte</span>
            <input
              className={ui.input}
              min="0"
              onChange={(event) =>
                patchQuestion({
                  points: Math.max(0, Number(event.target.value)),
                })
              }
              type="number"
              value={activeQuestion.points}
            />
          </label>
          <label className={ui.field}>
            <span>Antworten mischen</span>
            <select
              className={ui.input}
              onChange={(event) =>
                patchQuestion({ shuffle: event.target.value === "yes" })
              }
              value={activeQuestion.shuffle ? "yes" : "no"}
            >
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </label>
        </div>
      </div>
    </article>
  );
}
