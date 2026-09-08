export type RetentionConfig = { resultDays?: number; supervisionDays?: number };

function readDays(value: string | undefined, name: string) {
  if (!value?.trim()) return undefined;
  if (!/^\d+$/.test(value.trim()) || Number(value) < 1 || Number(value) > 36_500) {
    throw new Error(`${name} muss eine ganze Zahl zwischen 1 und 36500 sein.`);
  }
  return Number(value);
}

export function readRetentionConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RetentionConfig {
  return {
    resultDays: readDays(environment.EXAM_RESULT_RETENTION_DAYS, "EXAM_RESULT_RETENTION_DAYS"),
    supervisionDays: readDays(environment.EXAM_SUPERVISION_RETENTION_DAYS, "EXAM_SUPERVISION_RETENTION_DAYS"),
  };
}

export function planExamRetention(config: RetentionConfig, now = new Date()) {
  const cutoff = (days: number | undefined) => days === undefined
    ? undefined : new Date(now.getTime() - days * 86_400_000).toISOString();
  return {
    active: Boolean(config.resultDays || config.supervisionDays),
    resultCutoff: cutoff(config.resultDays),
    supervisionCutoff: cutoff(config.supervisionDays),
  };
}
