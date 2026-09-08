import assert from "node:assert/strict";
import test from "node:test";
import { planExamRetention, readRetentionConfig } from "../src/lib/exam-retention-policy";

test("Aufbewahrung ist ohne Konfiguration inaktiv", () => {
  assert.deepEqual(planExamRetention(readRetentionConfig({}), new Date("2026-09-08T00:00:00Z")), {
    active: false, resultCutoff: undefined, supervisionCutoff: undefined,
  });
});

test("Resultat- und Aufsichtsfristen sind getrennt konfigurierbar", () => {
  assert.deepEqual(readRetentionConfig({ EXAM_RESULT_RETENTION_DAYS: "365" }), { resultDays: 365, supervisionDays: undefined });
  assert.deepEqual(readRetentionConfig({ EXAM_SUPERVISION_RETENTION_DAYS: "30" }), { resultDays: undefined, supervisionDays: 30 });
  assert.deepEqual(planExamRetention({ resultDays: 10, supervisionDays: 2 }, new Date("2026-09-08T00:00:00Z")), {
    active: true, resultCutoff: "2026-08-29T00:00:00.000Z", supervisionCutoff: "2026-09-06T00:00:00.000Z",
  });
});

test("ungültige Aufbewahrungswerte aktivieren keine Löschung", () => {
  for (const value of ["0", "1.5", "-1", "36501", "morgen"]) {
    assert.throws(() => readRetentionConfig({ EXAM_RESULT_RETENTION_DAYS: value }), /ganze Zahl/);
  }
});
