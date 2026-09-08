import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redactedError } from "@/lib/error-redaction";
import { planExamRetention, type RetentionConfig } from "@/lib/exam-retention-policy";

async function completedAttemptIds(client: SupabaseClient, olderThan: string) {
  const { data, error } = await client.from("exam_attempts").select("id")
    .neq("status", "in-progress").not("submittedAt", "is", null).lt("submittedAt", olderThan);
  if (error) throw redactedError(error);
  return (data ?? []).map(({ id }) => String(id));
}

async function countRows(client: SupabaseClient, table: "exam_events" | "exam_instances", ids: string[]) {
  if (!ids.length) return 0;
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true }).in("attemptId", ids);
  if (error) throw redactedError(error);
  return count ?? 0;
}

export async function runExamRetention(client: SupabaseClient, config: RetentionConfig, now = new Date()) {
  const plan = planExamRetention(config, now);
  const report = { active: plan.active, attempts: 0, instances: 0, events: 0 };
  if (!report.active) return report;

  if (plan.supervisionCutoff) {
    const ids = await completedAttemptIds(client, plan.supervisionCutoff);
    report.events += await countRows(client, "exam_events", ids);
    if (ids.length) {
      const { error } = await client.from("exam_events").delete().in("attemptId", ids);
      if (error) throw redactedError(error);
    }
  }

  if (plan.resultCutoff) {
    const ids = await completedAttemptIds(client, plan.resultCutoff);
    report.instances = await countRows(client, "exam_instances", ids);
    report.events += await countRows(client, "exam_events", ids);
    if (ids.length) {
      const { data, error } = await client.from("exam_attempts").delete().in("id", ids).select("id");
      if (error) throw redactedError(error);
      report.attempts = data?.length ?? 0;
    }
  }
  return report;
}
