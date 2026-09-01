"use client";

import {
  ArrowLeft,
  ChevronRight,
  Eye,
  FileOutput,
  FolderPlus,
  ImageIcon,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuizApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import type { Question } from "@/lib/quiz-types";
import { QUIZ_UNASSIGNED_TOPIC_ID } from "@/lib/quiz-types";
import { QuestionPoolDialog } from "./question-pool-dialog";
import { QuizQuestionEditor } from "./quiz-question-editor";
import { QuizScoringSettings } from "./quiz-scoring-settings";
import styles from "./page.module.css";

export default function QuizEditorPage() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const {
    state,
    updateQuiz,
    createQuestion,
    createTopic,
    updateQuestion,
    addQuestionToQuiz,
    removeQuestionFromQuiz,
    showToast,
  } = useQuizApp();
  const quiz = state.quizzes.find((item) => item.id === quizId);
  const quizQuestions = useMemo(
    () =>
      quiz?.questionIds
        .map((id) => state.questions.find((question) => question.id === id))
        .filter((question): question is Question => Boolean(question)) ?? [],
    [quiz, state.questions],
  );
  const [activeId, setActiveId] = useState("");
  const [showPool, setShowPool] = useState(false);
  const [poolQuery, setPoolQuery] = useState("");
  const [poolTopicId, setPoolTopicId] = useState("all");
  const [poolTargetTopicId, setPoolTargetTopicId] = useState("");
  const [collapsedTopics, setCollapsedTopics] = useState<string[]>([]);
  const [showTopicCreator, setShowTopicCreator] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  if (!quiz) {
    return (
      <EmptyState
        action={
          <Link className={ui.button} href="/quizzes">
            <ArrowLeft aria-hidden="true" /> Zur Quizliste
          </Link>
        }
        icon={FileOutput}
        text="Das Quiz wurde gelöscht oder ist auf diesem Gerät nicht vorhanden."
        title="Quiz nicht gefunden"
      />
    );
  }

  const resolvedActiveId = quizQuestions.some(
    (question) => question.id === activeId,
  )
    ? activeId
    : (quizQuestions[0]?.id ?? "");
  const activeQuestion = quizQuestions.find(
    (question) => question.id === resolvedActiveId,
  );

  const allCategoryTopics = state.topics.filter(
    (topic) => topic.categoryId === quiz.categoryId,
  );
  const hiddenTopicIds = new Set(quiz.hiddenTopicIds);
  const categoryTopics = allCategoryTopics.filter(
    (topic) => !hiddenTopicIds.has(topic.id),
  );
  const hiddenCategoryTopics = allCategoryTopics.filter((topic) =>
    hiddenTopicIds.has(topic.id),
  );
  const unassignedQuizQuestions = quizQuestions.filter(
    (question) =>
      !question.topicId || hiddenTopicIds.has(question.topicId),
  );
  const quizTopicIds = Array.from(
    new Set(
      quizQuestions.map((question) =>
        !question.topicId || hiddenTopicIds.has(question.topicId)
          ? QUIZ_UNASSIGNED_TOPIC_ID
          : question.topicId,
      ),
    ),
  );
  const poolQuestions = state.questions.filter((question) => {
    const needle = poolQuery.trim().toLowerCase();
    return (
      question.categoryId === quiz.categoryId &&
      !quiz.questionIds.includes(question.id) &&
      (poolTopicId === "all" || question.topicId === poolTopicId) &&
      (!needle ||
        question.title.toLowerCase().includes(needle) ||
        question.description.toLowerCase().includes(needle))
    );
  });

  function addNewQuestion(topicId?: string) {
    if (!quiz) return;
    const questionId = createQuestion(
      quiz.categoryId,
      topicId ??
        (poolTargetTopicId ||
          (poolTopicId === "all" ? categoryTopics[0]?.id : poolTopicId)),
    );
    addQuestionToQuiz(quiz.id, questionId);
    setActiveId(questionId);
    setShowPool(false);
  }

  function openPoolForTopic(topicId: string) {
    setPoolTopicId("all");
    setPoolTargetTopicId(topicId);
    setShowPool(true);
  }

  function addTopic() {
    const name = newTopicName.trim();
    if (!name || !quiz) return;
    const topicId = createTopic(quiz.categoryId, name);
    setNewTopicName("");
    setShowTopicCreator(false);
    setCollapsedTopics((current) =>
      current.filter((currentId) => currentId !== topicId),
    );
    showToast(`Unterkategorie „${name}“ wurde erstellt.`);
  }

  function hideTopicFromQuiz(topicId: string, name: string) {
    if (!quiz) return;
    const topicPassPercentages = { ...quiz.topicPassPercentages };
    delete topicPassPercentages[topicId];
    updateQuiz(quiz.id, {
      hiddenTopicIds: Array.from(
        new Set([...quiz.hiddenTopicIds, topicId]),
      ),
      topicPassPercentages,
    });
    setCollapsedTopics((current) =>
      current.filter((currentId) => currentId !== topicId),
    );
    if (poolTargetTopicId === topicId) setPoolTargetTopicId("");
    showToast(
      `„${name}“ wurde nur aus diesem Quiz entfernt und bleibt im Fragenpool.`,
    );
  }

  function restoreTopicInQuiz(topicId: string, name: string) {
    if (!quiz) return;
    updateQuiz(quiz.id, {
      hiddenTopicIds: quiz.hiddenTopicIds.filter((id) => id !== topicId),
    });
    showToast(`„${name}“ wird in diesem Quiz wieder angezeigt.`);
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <Link className={ui.button} href={`/preview?quiz=${quiz.id}`}>
              <Eye aria-hidden="true" />
              Vorschau
            </Link>
            <button
              className={ui.button}
              onClick={() => showToast("Alle Änderungen sind gespeichert.")}
              type="button"
            >
              <Save aria-hidden="true" />
              Speichern
            </button>
            <Link
              className={`${ui.button} ${ui.primary}`}
              href={`/export?quiz=${quiz.id}`}
            >
              <FileOutput aria-hidden="true" />
              Exportieren
            </Link>
          </>
        }
        eyebrow="Quiz bearbeiten"
        lead={`${quizQuestions.length} Fragen · Änderungen werden automatisch auf diesem Gerät gespeichert.`}
        title={quiz.title}
      />

      <section className={styles.quizMeta}>
        <label className={ui.field}>
          <span>Titel</span>
          <input
            className={ui.input}
            onChange={(event) =>
              updateQuiz(quiz.id, { title: event.target.value })
            }
            value={quiz.title}
          />
        </label>
        <label className={ui.field}>
          <span>Kategorie</span>
          <select
            className={ui.input}
            onChange={(event) =>
              updateQuiz(quiz.id, { categoryId: event.target.value })
            }
            value={quiz.categoryId}
          >
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          <span>Status</span>
          <select
            className={ui.input}
            onChange={(event) =>
              updateQuiz(quiz.id, {
                status: event.target.value as typeof quiz.status,
              })
            }
            value={quiz.status}
          >
            <option value="draft">Entwurf</option>
            <option value="ready">Bereit</option>
            <option value="exported">Exportiert</option>
          </select>
        </label>
      </section>

      <QuizScoringSettings
        onUpdate={(patch) => updateQuiz(quiz.id, patch)}
        quiz={quiz}
        quizTopicIds={quizTopicIds}
        topics={state.topics}
      />

      <section className={styles.editorGrid}>
        <aside className={`${ui.card} ${styles.questionList}`}>
          <div className={styles.topicListHead}>
            <span>Unterkategorien</span>
            <button
              aria-label="Unterkategorie erstellen"
              onClick={() => setShowTopicCreator((current) => !current)}
              type="button"
            >
              <FolderPlus aria-hidden="true" />
            </button>
          </div>
          {showTopicCreator ? (
            <div className={styles.topicCreator}>
              <input
                autoFocus
                onChange={(event) => setNewTopicName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addTopic();
                  if (event.key === "Escape") setShowTopicCreator(false);
                }}
                placeholder="z. B. Grundlagen"
                value={newTopicName}
              />
              <button
                disabled={!newTopicName.trim()}
                onClick={addTopic}
                type="button"
              >
                Anlegen
              </button>
              {hiddenCategoryTopics.length ? (
                <div className={styles.hiddenTopics}>
                  <small>Aus diesem Quiz entfernt</small>
                  {hiddenCategoryTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => restoreTopicInQuiz(topic.id, topic.name)}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                      {topic.name} wieder hinzufügen
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {categoryTopics.map((topic) => {
            const topicQuestions = quizQuestions.filter(
              (question) => question.topicId === topic.id,
            );
            const collapsed = collapsedTopics.includes(topic.id);
            return (
              <div className={styles.topicGroup} key={topic.id}>
                <div className={styles.topicHeaderRow}>
                  <button
                    aria-expanded={!collapsed}
                    className={styles.topicHeader}
                    onClick={() =>
                      setCollapsedTopics((current) =>
                        collapsed
                          ? current.filter((id) => id !== topic.id)
                          : [...current, topic.id],
                      )
                    }
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" />
                    <span>
                      <strong>{topic.name}</strong>
                      <small>
                        {topicQuestions.length}{" "}
                        {topicQuestions.length === 1 ? "Frage" : "Fragen"}
                      </small>
                    </span>
                  </button>
                  <button
                    aria-label={`${topic.name} aus diesem Quiz entfernen`}
                    className={styles.topicDelete}
                    onClick={() => hideTopicFromQuiz(topic.id, topic.name)}
                    title="Nur aus diesem Quiz entfernen"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                {!collapsed ? (
                  <div className={styles.topicQuestions}>
                    {topicQuestions.map((question) => (
                      <button
                        className={styles.questionItem}
                        data-active={question.id === activeQuestion?.id}
                        key={question.id}
                        onClick={() => setActiveId(question.id)}
                        type="button"
                      >
                        <span>
                          {quizQuestions.indexOf(question) + 1}
                        </span>
                        <span>
                          <strong>
                            {question.title || "Unbenannte Frage"}
                          </strong>
                          <small>
                            {question.image ? (
                              <ImageIcon aria-label="Mit Bild" />
                            ) : null}
                            {question.points} P.
                          </small>
                        </span>
                      </button>
                    ))}
                    <button
                      className={styles.topicAdd}
                      onClick={() => openPoolForTopic(topic.id)}
                      type="button"
                    >
                      <Plus aria-hidden="true" /> Frage zuordnen
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {unassignedQuizQuestions.length || !categoryTopics.length ? (
            <div className={styles.topicGroup}>
              <div className={styles.unassignedHeader}>
                <span>
                  <strong>Ohne Unterkategorie</strong>
                  <small>
                    {unassignedQuizQuestions.length}{" "}
                    {unassignedQuizQuestions.length === 1 ? "Frage" : "Fragen"}
                  </small>
                </span>
              </div>
              <div className={styles.topicQuestions}>
                {unassignedQuizQuestions.map((question) => (
                  <button
                    className={styles.questionItem}
                    data-active={question.id === activeQuestion?.id}
                    key={question.id}
                    onClick={() => setActiveId(question.id)}
                    type="button"
                  >
                    <span>{quizQuestions.indexOf(question) + 1}</span>
                    <span>
                      <strong>{question.title || "Unbenannte Frage"}</strong>
                      <small>
                        {question.image ? (
                          <ImageIcon aria-label="Mit Bild" />
                        ) : null}
                        {question.points} P.
                      </small>
                    </span>
                  </button>
                ))}
                <button
                  className={styles.topicAdd}
                  onClick={() => openPoolForTopic("")}
                  type="button"
                >
                  <Plus aria-hidden="true" /> Frage zuordnen
                </button>
              </div>
            </div>
          ) : null}
          <button
            className={styles.addQuestion}
            onClick={() => {
              setPoolTargetTopicId(activeQuestion?.topicId ?? "");
              setShowPool(true);
            }}
            type="button"
          >
            <Plus aria-hidden="true" />
            Aus Fragenpool hinzufügen
          </button>
        </aside>

        <QuizQuestionEditor
          activeQuestion={activeQuestion}
          categories={state.categories}
          onOpenPool={() => setShowPool(true)}
          onRemove={(questionId) => removeQuestionFromQuiz(quiz.id, questionId)}
          onToast={showToast}
          onUpdate={updateQuestion}
          questionNumber={
            activeQuestion ? quizQuestions.indexOf(activeQuestion) + 1 : 0
          }
          topics={state.topics}
        />
      </section>

      {showPool ? (
        <QuestionPoolDialog
          allTopics={allCategoryTopics}
          onAdd={(question) => {
            if (
              poolTargetTopicId &&
              question.topicId !== poolTargetTopicId
            ) {
              updateQuestion(question.id, { topicId: poolTargetTopicId });
            }
            addQuestionToQuiz(quiz.id, question.id);
            setActiveId(question.id);
            showToast("Frage wurde aus dem Pool hinzugefügt.");
          }}
          onClose={() => setShowPool(false)}
          onCreate={() => addNewQuestion()}
          onQueryChange={setPoolQuery}
          onSelectedTopicChange={setPoolTopicId}
          onTargetTopicChange={setPoolTargetTopicId}
          query={poolQuery}
          questions={poolQuestions}
          quiz={quiz}
          selectedTopicId={poolTopicId}
          targetTopicId={poolTargetTopicId}
          visibleTopics={categoryTopics}
        />
      ) : null}
    </>
  );
}
