import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type JsonObject = Record<string, unknown>;
type Filter = Record<string, string>;

const projectRoot = resolve(import.meta.dirname, "..");
const runId = randomUUID();
const ids = {
  category: `security-category-${runId}`,
  topic: `security-topic-${runId}`,
  question: `security-question-${runId}`,
  answer: `security-answer-${runId}`,
  quiz: `security-quiz-${runId}`,
  emptyQuiz: `security-empty-quiz-${runId}`,
  export: `security-export-${runId}`,
  publication: `security-publication-${runId}`,
  attempt: `security-attempt-${runId}`,
  instance: `security-instance-${runId}`,
  event: `security-event-${runId}`,
};
const slug = `security-${runId}`;
const password = `Security-${randomBytes(16).toString("hex")}!`;
const adminEmail = `security-admin-${runId}@example.invalid`;
const userBEmail = `security-user-b-${runId}@example.invalid`;
const appOrigin = "https://alphaquiz-security.test";
const port = 32_000 + Math.floor(Math.random() * 2_000);
const baseUrl = `http://127.0.0.1:${port}`;

let appProcess: ChildProcess | undefined;
let serviceClient: SupabaseClient;
let userBClient: SupabaseClient;
let anonClient: SupabaseClient;
let adminCookie = "";
let userBCookie = "";
let adminUserId = "";
let userBId = "";
let fileEnvironment: Record<string, string> = {};

function readEnvironmentFile() {
  let source = "";
  try {
    source = readFileSync(resolve(projectRoot, ".env"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        return [key, value];
      }),
  );
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim() || fileEnvironment[name]?.trim();
  assert.ok(value, `${name} muss für die Autorisierungsprüfung gesetzt sein.`);
  return value;
}

async function waitForServer(url: string, child: ChildProcess) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Der Testserver wurde mit ${child.exitCode} beendet.`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error("Der Testserver war nach 20 Sekunden nicht bereit.");
}

async function startServer(overrides: Record<string, string>, serverPort = port) {
  const child = spawn(
    process.execPath,
    [
      resolve(projectRoot, "node_modules/next/dist/bin/next"),
      "start",
      "--port",
      String(serverPort),
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...fileEnvironment,
        NODE_ENV: "production",
        APP_ORIGIN: appOrigin,
        RATE_LIMIT_SECRET: randomBytes(32).toString("hex"),
        ...overrides,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  await waitForServer(`http://127.0.0.1:${serverPort}`, child);
  return child;
}

async function stopServer(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise<void>((resolveStop) => {
    const timeout = setTimeout(resolveStop, 2_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
  });
}

async function createSession(email: string) {
  const cookieJar = new Map<string, string>();
  const client = createServerClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return [...cookieJar].map(([name, value]) => ({ name, value }));
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            if (cookie.value) cookieJar.set(cookie.name, cookie.value);
            else cookieJar.delete(cookie.name);
          }
        },
      },
    },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  assert.ifError(error);
  assert.ok(data.session?.access_token);
  return {
    cookie: [...cookieJar]
      .map(([name, value]) => `${name}=${value}`)
      .join("; "),
    token: data.session.access_token,
  };
}

function userClient(accessToken: string) {
  return createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

async function insertFixture(table: string, values: JsonObject | JsonObject[]) {
  const { error } = await serviceClient.from(table).insert(values);
  assert.ifError(error);
}

async function request(
  path: string,
  init: RequestInit = {},
  cookie = "",
  targetBaseUrl = baseUrl,
) {
  const headers = new Headers(init.headers);
  headers.set("Origin", appOrigin);
  if (cookie) headers.set("Cookie", cookie);
  return fetch(`${targetBaseUrl}${path}`, { ...init, headers });
}

async function assertNoDataResponse(response: Response, status: number) {
  assert.equal(response.status, status);
  const body = (await response.json()) as JsonObject;
  assert.deepEqual(Object.keys(body), ["error"]);
}

async function assertForbiddenAdminResponse(response: Response) {
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error:
      "Dieses Konto ist nicht als AlphaQuiz-Administrator freigeschaltet.",
  });
}

async function assertServerCanReachSupabase() {
  const response = await request("/api/admin/status", {}, adminCookie);
  const body = (await response.json().catch(() => null)) as JsonObject | null;
  assert.equal(
    response.status,
    200,
    `AlphaQuiz-Startcheck fehlgeschlagen: Der Testserver kann Supabase nicht ` +
      `mit der Admin-Session erreichen (HTTP ${response.status}, ` +
      `${JSON.stringify(body)}).`,
  );
  assert.deepEqual(body, { configured: true, reachable: true });
}

async function assertForeignReadDenied(table: string, filter: Filter) {
  const result = await userBClient.from(table).select("*").match(filter);
  assert.ifError(result.error);
  assert.deepEqual(result.data, []);
}

async function assertForeignUpdateDenied(
  table: string,
  filter: Filter,
  update: JsonObject,
) {
  const before = await serviceClient
    .from(table)
    .select("*")
    .match(filter)
    .maybeSingle();
  assert.ifError(before.error);
  assert.ok(before.data, `${table}: Testzeile fehlt vor dem fremden Update.`);

  const result = await userBClient
    .from(table)
    .update(update)
    .match(filter)
    .select("*");
  assert.ifError(result.error);
  assert.deepEqual(result.data, []);

  const after = await serviceClient
    .from(table)
    .select("*")
    .match(filter)
    .maybeSingle();
  assert.ifError(after.error);
  assert.deepEqual(
    after.data,
    before.data,
    `${table}: Das fremde Update hat die Testzeile verändert.`,
  );
}

async function assertForeignDeleteDenied(table: string, filter: Filter) {
  const before = await serviceClient
    .from(table)
    .select("*")
    .match(filter)
    .maybeSingle();
  assert.ifError(before.error);
  assert.ok(before.data, `${table}: Testzeile fehlt vor dem fremden Delete.`);

  const result = await userBClient.from(table).delete().match(filter).select("*");
  assert.ifError(result.error);
  assert.deepEqual(result.data, []);

  const after = await serviceClient
    .from(table)
    .select("*")
    .match(filter)
    .maybeSingle();
  assert.ifError(after.error);
  assert.deepEqual(
    after.data,
    before.data,
    `${table}: Das fremde Delete hat die Testzeile entfernt oder verändert.`,
  );
}

async function startPublicAttempt(publicationSlug = slug) {
  const response = await request(`/api/public/exams/${publicationSlug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
    },
    body: JSON.stringify({
      name: "Security Test",
      email: `attempt-${randomUUID()}@example.invalid`,
    }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    attempt: { id: string };
  };
  const cookies = response.headers.getSetCookie();
  return {
    attemptId: body.attempt.id,
    cookie: cookies.map((cookie) => cookie.split(";", 1)[0]).join("; "),
  };
}

before(async () => {
  fileEnvironment = readEnvironmentFile();
  const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey = requiredEnvironment(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [adminResult, userBResult] = await Promise.all([
    serviceClient.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    }),
    serviceClient.auth.admin.createUser({
      email: userBEmail,
      password,
      email_confirm: true,
    }),
  ]);
  assert.ifError(adminResult.error);
  assert.ifError(userBResult.error);
  adminUserId = adminResult.data.user.id;
  userBId = userBResult.data.user.id;

  const [adminSession, userBSession] = await Promise.all([
    createSession(adminEmail),
    createSession(userBEmail),
  ]);
  adminCookie = adminSession.cookie;
  userBCookie = userBSession.cookie;
  userBClient = userClient(userBSession.token);
  anonClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ok(publishableKey);

  await insertFixture("categories", {
    id: ids.category,
    user_id: adminUserId,
    name: "Security category",
    color: "#123456",
  });
  await insertFixture("topics", {
    id: ids.topic,
    categoryId: ids.category,
    name: "Security topic",
  });
  await insertFixture("questions", {
    id: ids.question,
    user_id: adminUserId,
    title: "Security question",
    description: "",
    type: "single",
    categoryId: ids.category,
    topicId: ids.topic,
    points: 1,
    shuffle: true,
  });
  await insertFixture("answers", {
    id: ids.answer,
    questionId: ids.question,
    text: "Secret correct answer",
    correct: true,
    position: 0,
  });
  await insertFixture("quizzes", [
    {
      id: ids.quiz,
      user_id: adminUserId,
      title: "Security quiz",
      description: "",
      categoryId: ids.category,
      status: "ready",
      passPercentage: 70,
      scoringMode: "combined",
      topicPassPercentages: {},
      hiddenTopicIds: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: ids.emptyQuiz,
      user_id: adminUserId,
      title: "Security empty quiz",
      description: "",
      categoryId: ids.category,
      status: "draft",
      passPercentage: 70,
      scoringMode: "combined",
      topicPassPercentages: {},
      hiddenTopicIds: [],
      updatedAt: new Date().toISOString(),
    },
  ]);
  await insertFixture("quiz_questions", {
    quizId: ids.quiz,
    questionId: ids.question,
    position: 0,
  });
  await insertFixture("exports", {
    id: ids.export,
    user_id: adminUserId,
    quizId: ids.quiz,
    format: "json",
    fileName: "security.json",
    createdAt: new Date().toISOString(),
  });
  await insertFixture("exam_publications", {
    id: ids.publication,
    quizId: ids.quiz,
    slug,
    mode: "closed",
    timeLimit: 1,
    maxViolations: 2,
    active: true,
    sendResults: false,
    randomization: {
      questionOrderMode: "fixed",
      useTopics: true,
      questionCountByTopic: {},
      shuffleAnswers: false,
      requiredQuestionIds: [],
      lockedQuestionIds: [],
      retryMode: "regenerate",
    },
    createdAt: new Date().toISOString(),
  });
  await insertFixture("exam_attempts", {
    id: ids.attempt,
    publicationId: ids.publication,
    name: "Foreign attempt",
    email: `fixture-${runId}@example.invalid`,
    status: "in-progress",
    startedAt: new Date().toISOString(),
    currentQuestion: 0,
    responses: {},
    score: 0,
    possible: 0,
    percentage: 0,
    passed: false,
    topicResults: [],
    violationCount: 0,
    resultEmailStatus: "pending",
    updatedAt: new Date().toISOString(),
  });
  await insertFixture("exam_instances", {
    id: ids.instance,
    attemptId: ids.attempt,
    publicationId: ids.publication,
    quizId: ids.quiz,
    studentKey: `fixture-${runId}@example.invalid`,
    questionOrder: [ids.question],
    topicOrder: [ids.topic],
    answerOrderByQuestionId: { [ids.question]: [ids.answer] },
    snapshot: {},
    seed: "fixture-seed",
    generatedAt: new Date().toISOString(),
  });
  await insertFixture("exam_events", {
    id: ids.event,
    publicationId: ids.publication,
    attemptId: ids.attempt,
    type: "started",
    message: "Fixture started",
    createdAt: new Date().toISOString(),
  });

  appProcess = await startServer({ ADMIN_EMAIL: adminEmail });
  await assertServerCanReachSupabase();
});

after(async () => {
  await stopServer(appProcess);
  if (serviceClient) {
    for (const [table, filter] of [
      ["exam_events", { publicationId: ids.publication }],
      ["exam_instances", { publicationId: ids.publication }],
      ["exam_attempts", { publicationId: ids.publication }],
      ["exam_publications", { id: ids.publication }],
      ["quiz_questions", { quizId: ids.quiz }],
      ["exports", { id: ids.export }],
      ["quizzes", { user_id: adminUserId }],
      ["answers", { questionId: ids.question }],
      ["questions", { id: ids.question }],
      ["topics", { id: ids.topic }],
      ["categories", { user_id: adminUserId }],
    ] as Array<[string, Filter]>) {
      await serviceClient.from(table).delete().match(filter);
    }
    if (adminUserId) await serviceClient.auth.admin.deleteUser(adminUserId);
    if (userBId) await serviceClient.auth.admin.deleteUser(userBId);
  }
});

const unauthenticatedEndpoints = [
  ["Kategorien", "/api/admin/categories", "PUT", { categories: [] }],
  ["Unterkategorien", "/api/admin/topics", "PUT", { topics: [] }],
  ["Fragen", "/api/admin/questions", "PUT", { questions: [] }],
  ["Quizzes", "/api/admin/quizzes", "PUT", { quizzes: [] }],
  ["Exporte", "/api/admin/exports", "PUT", { exports: [] }],
  [
    "Prüfungsveröffentlichungen",
    "/api/admin/exam-publications",
    "PUT",
    { examPublications: [] },
  ],
  ["Prüfungsaktivität", "/api/admin/activity", "GET", undefined],
  ["Status", "/api/admin/status", "GET", undefined],
  ["Gesamtzustand", "/api/admin/state", "GET", undefined],
] as const;

for (const [name, path, method, body] of unauthenticatedEndpoints) {
  test(`a) nicht angemeldet: ${name} liefert 401 ohne Daten`, async () => {
    const response = await request(path, {
      method,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    await assertNoDataResponse(response, 401);
  });
}

const additionalProtectedEndpoints: Array<[
  string,
  string,
  () => RequestInit,
]> = [
  [
    "Prüfungsveröffentlichung löschen",
    `/api/admin/exam-publications/${ids.publication}`,
    () => ({ method: "DELETE" }),
  ],
  [
    "Prüfungsversuch freigeben",
    `/api/admin/exam-attempts/${ids.attempt}/reset`,
    () => ({ method: "POST" }),
  ],
  [
    "Ergebnis-E-Mail senden",
    "/api/exam-results/send",
    () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: ids.attempt }),
    }),
  ],
  [
    "Datei exportieren",
    "/api/export",
    () => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz: {
          id: ids.quiz,
          title: "Security quiz",
          description: "",
          categoryId: ids.category,
          status: "ready",
          questionIds: [],
          passPercentage: 70,
          scoringMode: "combined",
          topicPassPercentages: {},
          hiddenTopicIds: [],
          updatedAt: new Date().toISOString(),
        },
        questions: [],
        format: "json",
      }),
    }),
  ],
  [
    "Datei importieren",
    "/api/import",
    () => {
      const form = new FormData();
      form.set(
        "file",
        new File(
          [JSON.stringify({ version: 1, categories: [], questions: [] })],
          "security.json",
          { type: "application/json" },
        ),
      );
      return { method: "POST", body: form };
    },
  ],
];

for (const [name, path, init] of additionalProtectedEndpoints) {
  test(`a) nicht angemeldet: ${name} liefert 401 ohne Daten`, async () => {
    const response = await request(path, init());
    await assertNoDataResponse(response, 401);
  });
}

const resources = [
  ["categories", { id: ids.category }, { name: "Hacked" }],
  ["topics", { id: ids.topic }, { name: "Hacked" }],
  ["questions", { id: ids.question }, { title: "Hacked" }],
  ["quizzes", { id: ids.quiz }, { title: "Hacked" }],
  ["exports", { id: ids.export }, { fileName: "hacked.json" }],
  ["exam_publications", { id: ids.publication }, { active: false }],
  ["exam_attempts", { id: ids.attempt }, { name: "Hacked" }],
  ["exam_instances", { id: ids.instance }, { seed: "hacked" }],
  ["exam_events", { id: ids.event }, { message: "Hacked" }],
] as const;

for (const [table, filter, update] of resources) {
  test(`b) Nutzer B kann ${table} von Nutzer A nicht lesen`, async () => {
    await assertForeignReadDenied(table, filter);
  });
  test(`b) Nutzer B kann ${table} von Nutzer A nicht ändern`, async () => {
    await assertForeignUpdateDenied(table, filter, update);
  });
  test(`b) Nutzer B kann ${table} von Nutzer A nicht löschen`, async () => {
    await assertForeignDeleteDenied(table, filter);
  });
}

test("c) Nutzer B kann fremde answers nicht lesen", async () => {
  await assertForeignReadDenied("answers", { id: ids.answer });
});

test("c) Nutzer B kann answers nicht über eine fremde Frage einfügen", async () => {
  const { error } = await userBClient.from("answers").insert({
    id: `security-answer-b-${runId}`,
    questionId: ids.question,
    text: "Injected",
    correct: true,
    position: 1,
  });
  assert.ok(error);
});

test("c) Nutzer B kann fremde answers nicht ändern", async () => {
  await assertForeignUpdateDenied(
    "answers",
    { id: ids.answer },
    { text: "Hacked" },
  );
});

test("c) Nutzer B kann fremde answers nicht löschen", async () => {
  await assertForeignDeleteDenied("answers", { id: ids.answer });
});

test("c) Nutzer B kann fremde quiz_questions nicht lesen", async () => {
  await assertForeignReadDenied("quiz_questions", {
    quizId: ids.quiz,
    questionId: ids.question,
  });
});

test("c) Nutzer B kann quiz_questions nicht über fremde Parents einfügen", async () => {
  const { error } = await userBClient.from("quiz_questions").insert({
    quizId: ids.emptyQuiz,
    questionId: ids.question,
    position: 0,
  });
  assert.ok(error);
});

test("c) Nutzer B kann topics nicht über eine fremde Kategorie einfügen", async () => {
  const { error } = await userBClient.from("topics").insert({
    id: `security-topic-b-${runId}`,
    categoryId: ids.category,
    name: "Injected topic",
  });
  assert.ok(error);
});

test("c) Nutzer B kann exam_publications nicht über ein fremdes Quiz einfügen", async () => {
  const { error } = await userBClient.from("exam_publications").insert({
    id: `security-publication-b-${runId}`,
    quizId: ids.quiz,
    slug: `security-publication-b-${runId}`,
    mode: "closed",
    timeLimit: 45,
    maxViolations: 1,
    active: true,
    sendResults: false,
    randomization: {
      questionOrderMode: "fixed",
      useTopics: true,
      questionCountByTopic: {},
      shuffleAnswers: false,
      requiredQuestionIds: [],
      lockedQuestionIds: [],
      retryMode: "regenerate",
    },
    createdAt: new Date().toISOString(),
  });
  assert.ok(error);
});

test("c) Nutzer B kann fremde quiz_questions nicht ändern", async () => {
  await assertForeignUpdateDenied(
    "quiz_questions",
    { quizId: ids.quiz, questionId: ids.question },
    { position: 99 },
  );
});

test("c) Nutzer B kann fremde quiz_questions nicht löschen", async () => {
  await assertForeignDeleteDenied("quiz_questions", {
    quizId: ids.quiz,
    questionId: ids.question,
  });
});

test("d) user_id-Spoofing erzeugt keine Ressource für Nutzer B", async () => {
  const spoofedId = `security-spoofed-${runId}`;
  const response = await request(
    "/api/admin/categories",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: [
          {
            id: ids.category,
            name: "Security category",
            color: "#123456",
          },
          {
            id: spoofedId,
            name: "Spoofed",
            color: "#123456",
            user_id: userBId,
          },
        ],
      }),
    },
    adminCookie,
  );
  assert.ok([200, 400].includes(response.status));
  const { data, error } = await serviceClient
    .from("categories")
    .select("user_id")
    .eq("id", spoofedId)
    .maybeSingle();
  assert.ifError(error);
  assert.notEqual(data?.user_id, userBId);
  if (data) assert.equal(data.user_id, adminUserId);
});

test("anon kann public-Tabellen nicht lesen", async () => {
  const { error } = await anonClient.from("categories").select("id").limit(1);
  assert.ok(error);
});

test("anon kann nicht in public-Tabellen einfügen", async () => {
  const { error } = await anonClient.from("categories").insert({
    id: `security-anon-category-${runId}`,
    user_id: adminUserId,
    name: "Anon category",
    color: "#123456",
  });
  assert.ok(error);
});

test("anon kann public-Tabellen nicht ändern", async () => {
  const { error } = await anonClient
    .from("categories")
    .update({ name: "Anon hacked" })
    .eq("id", ids.category);
  assert.ok(error);
});

test("anon kann aus public-Tabellen nicht löschen", async () => {
  const { error } = await anonClient
    .from("categories")
    .delete()
    .eq("id", ids.category);
  assert.ok(error);
});

for (const [name, path, method, body] of unauthenticatedEndpoints) {
  test(`e) Nicht-Admin erhält bei ${name} 403`, async () => {
    const response = await request(
      path,
      {
        method,
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      },
      userBCookie,
    );
    await assertForbiddenAdminResponse(response);
  });
}

for (const [name, path, init] of additionalProtectedEndpoints) {
  test(`e) Nicht-Admin erhält bei ${name} 403`, async () => {
    const response = await request(path, init(), userBCookie);
    await assertForbiddenAdminResponse(response);
  });
}

test("f) ohne ADMIN_EMAIL bleibt der Adminbereich geschlossen", async () => {
  for (const [offset, nodeEnvironment] of [
    [1, "production"],
    [2, "development"],
  ] as const) {
    const closedPort = port + offset;
    const closedServer = await startServer(
      { ADMIN_EMAIL: "", NODE_ENV: nodeEnvironment },
      closedPort,
    );
    try {
      const response = await request(
        "/api/admin/state",
        {},
        adminCookie,
        `http://127.0.0.1:${closedPort}`,
      );
      await assertForbiddenAdminResponse(response);
    } finally {
      await stopServer(closedServer);
    }
  }
});

test("g) der öffentliche Prüfungsaufruf liefert keine Antwortschlüssel", async () => {
  const response = await fetch(`${baseUrl}/api/public/exams/${slug}`);
  assert.equal(response.status, 200);
  const source = await response.text();
  assert.doesNotMatch(source, /"correct"\s*:/);
  assert.doesNotMatch(source, /Secret correct answer/);
});

test("g) ein Prüfungsversuch ohne Token liefert keine Prüfungsdaten", async () => {
  const response = await fetch(
    `${baseUrl}/api/public/exam-attempts/${ids.attempt}`,
  );
  await assertNoDataResponse(response, 401);
});

test("g) PATCH speichert ohne Prüfungstoken keine Antworten", async () => {
  const response = await request(`/api/public/exam-attempts/${ids.attempt}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentQuestion: 0 }),
  });
  await assertNoDataResponse(response, 401);
});

test("g) PATCH speichert mit einem fremden Prüfungstoken keine Antworten", async () => {
  const first = await startPublicAttempt();
  const second = await startPublicAttempt();
  const response = await request(
    `/api/public/exam-attempts/${second.attemptId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentQuestion: 0 }),
    },
    first.cookie,
  );
  await assertNoDataResponse(response, 401);
});

test("g) ein Token einer fremden Prüfung kann kein Ergebnis einreichen", async () => {
  const first = await startPublicAttempt();
  const second = await startPublicAttempt();
  const response = await request(
    `/api/public/exam-attempts/${second.attemptId}`,
    { method: "POST" },
    first.cookie,
  );
  await assertNoDataResponse(response, 401);
});

test("g) ein abgelaufener Prüfungstoken wird abgelehnt", async () => {
  const attempt = await startPublicAttempt();
  const { error } = await serviceClient
    .from("exam_attempts")
    .update({
      startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", attempt.attemptId);
  assert.ifError(error);
  const response = await fetch(
    `${baseUrl}/api/public/exam-attempts/${attempt.attemptId}`,
    { headers: { Cookie: attempt.cookie } },
  );
  assert.ok([401, 403].includes(response.status));
});

test("g) ein bereits benutzter Prüfungstoken wird abgelehnt", async () => {
  const attempt = await startPublicAttempt();
  const first = await request(
    `/api/public/exam-attempts/${attempt.attemptId}`,
    { method: "POST" },
    attempt.cookie,
  );
  assert.equal(first.status, 200);
  const second = await request(
    `/api/public/exam-attempts/${attempt.attemptId}`,
    { method: "POST" },
    attempt.cookie,
  );
  assert.ok([401, 403].includes(second.status));
});

test("Cross-Site-Logout wird abgelehnt", async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      Cookie: adminCookie,
      Origin: "https://attacker.example",
    },
  });
  await assertNoDataResponse(response, 403);
});

test("gültiger Nicht-Admin-Login endet im 403-Pfad", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": "198.51.100.241",
    },
    body: JSON.stringify({ email: userBEmail, password }),
  });
  await assertForbiddenAdminResponse(response);
});

test("Passwort-Reset antwortet für nicht freigegebene Konten generisch", async () => {
  const expected = {
    message: "Wenn das Konto existiert, wurde eine Rücksetz-Mail versendet.",
  };
  const responses = await Promise.all(
    [userBEmail, `missing-${runId}@example.invalid`].map((email, index) =>
      request("/api/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-forwarded-for": `203.0.113.${240 + index}`,
        },
        body: JSON.stringify({ email }),
      }),
    ),
  );
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
  }
});

test("h) Zod lehnt ein unbekanntes Zusatzfeld mit 400 ab", async () => {
  const response = await request(
    "/api/admin/categories",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: [], unexpected: true }),
    },
    adminCookie,
  );
  assert.equal(response.status, 400);
});

test("h) Zod lehnt einen falschen Typ mit 400 ab", async () => {
  const response = await request(
    "/api/admin/categories",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: "not-an-array" }),
    },
    adminCookie,
  );
  assert.equal(response.status, 400);
});

test("i) das Login-Rate-Limit greift nach zehn Versuchen", async () => {
  const address = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  for (let index = 0; index < 10; index += 1) {
    const response = await request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": address,
      },
      body: JSON.stringify({ email: userBEmail, password: "wrong-password" }),
    });
    assert.notEqual(response.status, 429);
  }
  const blocked = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": address,
    },
    body: JSON.stringify({ email: userBEmail, password: "wrong-password" }),
  });
  assert.equal(blocked.status, 429);
});

test("i) das Passwort-Reset-Rate-Limit greift nach fünf Versuchen", async () => {
  const address = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  for (let index = 0; index < 5; index += 1) {
    const response = await request("/api/auth/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": address,
      },
      body: JSON.stringify({ email: userBEmail }),
    });
    assert.notEqual(response.status, 429);
  }
  const blocked = await request("/api/auth/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": address,
    },
    body: JSON.stringify({ email: userBEmail }),
  });
  assert.equal(blocked.status, 429);
});

test("j) eine als MDB umbenannte Fremddatei wird per Signatur abgelehnt", async () => {
  const form = new FormData();
  form.set(
    "file",
    new File(["this is not an Access database"], "foreign.mdb", {
      type: "application/x-msaccess",
    }),
  );
  const response = await request(
    "/api/import",
    { method: "POST", body: form },
    adminCookie,
  );
  assert.equal(response.status, 415);
});

test("deleteMissingIds: ein leeres Array ohne Flag wird abgelehnt und löscht nichts", async () => {
  const response = await request(
    "/api/admin/exports",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exports: [] }),
    },
    adminCookie,
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error:
      "confirmDeleteAll: Zum Löschen aller Exporte muss " +
      "confirmDeleteAll: true gesetzt sein.",
  });

  const { data, error } = await serviceClient
    .from("exports")
    .select("id")
    .eq("id", ids.export)
    .maybeSingle();
  assert.ifError(error);
  assert.equal(data?.id, ids.export);
});

test("deleteMissingIds: ein nicht-leeres Array behält sein bisheriges Verhalten", async () => {
  const current = await serviceClient
    .from("exports")
    .select("*")
    .eq("id", ids.export)
    .maybeSingle();
  assert.ifError(current.error);
  assert.ok(current.data);

  const response = await request(
    "/api/admin/exports",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exports: [
          {
            id: ids.export,
            quizId: String(current.data.quizId),
            format: String(current.data.format),
            fileName: String(current.data.fileName),
            createdAt: String(current.data.createdAt),
          },
        ],
      }),
    },
    adminCookie,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: true });

  const after = await serviceClient
    .from("exports")
    .select("id,user_id")
    .eq("id", ids.export)
    .maybeSingle();
  assert.ifError(after.error);
  assert.deepEqual(after.data, { id: ids.export, user_id: adminUserId });
});

test("deleteMissingIds: ein leeres Array mit Flag löscht alle eigenen Exporte", async () => {
  const response = await request(
    "/api/admin/exports",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exports: [], confirmDeleteAll: true }),
    },
    adminCookie,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: true });

  const { data, error } = await serviceClient
    .from("exports")
    .select("id")
    .eq("user_id", adminUserId);
  assert.ifError(error);
  assert.deepEqual(data, []);
});
