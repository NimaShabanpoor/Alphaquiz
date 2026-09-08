// UI boundary only; API handlers independently verify authentication/ownership.
export function isAdminPagePath(path: string) {
  return /^\/(quizzes|questions|categories|exams|exam-activity|exam-results|import|export|preview|settings)\/?$/.test(path)
    || /^\/(quizzes|exam-activity)\/[^/]+\/?$/.test(path);
}
