import { Tags } from "lucide-react";
import { ui } from "@/components/ui";
import type { Quiz, ScoringMode, Topic } from "@/lib/quiz-types";
import {
  QUIZ_UNASSIGNED_TOPIC_ID,
  scoringModeLabels,
} from "@/lib/quiz-types";
import styles from "./page.module.css";

type QuizScoringSettingsProps = {
  quiz: Quiz;
  quizTopicIds: string[];
  topics: Topic[];
  onUpdate: (patch: Partial<Quiz>) => void;
};

function clampPercentage(value: string) {
  return Math.min(100, Math.max(0, Number(value)));
}

export function QuizScoringSettings({
  quiz,
  quizTopicIds,
  topics,
  onUpdate,
}: QuizScoringSettingsProps) {
  return (
    <section className={`${ui.card} ${styles.scoring}`}>
      <div className={styles.scoringIntro}>
        <div>
          <span>Auswertung</span>
          <h2>Wie wird die Prüfung bestanden?</h2>
        </div>
        <p>
          Entscheide, ob alle Punkte zusammengezählt werden oder jedes Thema
          einzeln bestanden werden muss.
        </p>
      </div>
      <label className={ui.field}>
        <span>Berechnung</span>
        <select
          className={ui.input}
          onChange={(event) =>
            onUpdate({ scoringMode: event.target.value as ScoringMode })
          }
          value={quiz.scoringMode}
        >
          {(Object.keys(scoringModeLabels) as ScoringMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {scoringModeLabels[mode]}
            </option>
          ))}
        </select>
      </label>
      <label className={ui.field}>
        <span>Gesamtgrenze</span>
        <div className={styles.percentInput}>
          <input
            className={ui.input}
            max="100"
            min="0"
            onChange={(event) =>
              onUpdate({ passPercentage: clampPercentage(event.target.value) })
            }
            type="number"
            value={quiz.passPercentage}
          />
          <span>%</span>
        </div>
      </label>
      {quiz.scoringMode === "per-topic" ? (
        <div className={styles.topicThresholds}>
          <strong>Bestehensgrenze je enthaltenem Thema</strong>
          {quizTopicIds.length ? (
            quizTopicIds.map((topicId) => {
              const topic = topics.find((item) => item.id === topicId);
              return (
                <label key={topicId}>
                  <span>
                    <Tags aria-hidden="true" />
                    {topicId === QUIZ_UNASSIGNED_TOPIC_ID
                      ? "Ohne Unterkategorie"
                      : (topic?.name ?? "Ohne Unterkategorie")}
                  </span>
                  <div className={styles.percentInput}>
                    <input
                      className={ui.input}
                      max="100"
                      min="0"
                      onChange={(event) =>
                        onUpdate({
                          topicPassPercentages: {
                            ...quiz.topicPassPercentages,
                            [topicId]: clampPercentage(event.target.value),
                          },
                        })
                      }
                      type="number"
                      value={
                        quiz.topicPassPercentages[topicId] ??
                        quiz.passPercentage
                      }
                    />
                    <span>%</span>
                  </div>
                </label>
              );
            })
          ) : (
            <small>Füge zuerst Fragen aus mindestens einem Thema hinzu.</small>
          )}
        </div>
      ) : null}
    </section>
  );
}
