import assert from "node:assert/strict";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import test from "node:test";
import { assertServiceRoleAllowlist } from "./support/service-role-module-graph";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (path: string) =>
  readFileSync(resolve(projectRoot, path), "utf8");

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? listTypeScriptFiles(path)
      : [".ts", ".tsx"].includes(extname(entry.name))
        ? [path]
        : [];
  });
}

test("Admin-Datenzugriffe verwenden den request-scoped User-Client", () => {
  const adminRoutes = [
    "src/app/api/admin/state/route.ts",
    "src/app/api/admin/categories/route.ts",
    "src/app/api/admin/topics/route.ts",
    "src/app/api/admin/questions/route.ts",
    "src/app/api/admin/quizzes/route.ts",
    "src/app/api/admin/exports/route.ts",
    "src/app/api/admin/exam-publications/route.ts",
    "src/app/api/exam-results/send/route.ts",
    "src/app/api/admin/exam-attempts/[attemptId]/reset/route.ts",
  ];

  for (const route of adminRoutes) {
    const source = readProjectFile(route);
    assert.match(source, /requireAdmin\(request\)|authorizeAdminMutation\(request\)/);
    assert.match(source, /auth\.client/);
    assert.doesNotMatch(source, /getSupabaseAdmin|supabase-admin/);
  }
});

test("Service Role bleibt auf die zwei öffentlichen Prüfungsendpunkte begrenzt", () => {
  assertServiceRoleAllowlist({
    projectRoot,
    allowedConsumers: [
      "src/app/api/public/exam-attempts/[attemptId]/route.ts",
      "src/app/api/public/exams/[slug]/route.ts",
    ],
  });
});

test("Service-Role-Wächter erkennt dynamische und transitive Umgehungen", () => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "alphaquiz-service-role-guard-"),
  );
  const bridge = join(temporaryDirectory, "bridge.ts");
  const consumer = join(temporaryDirectory, "consumer.ts");
  writeFileSync(
    bridge,
    'export const loadAdmin = () => import("@/lib/supabase-admin");\n',
  );
  writeFileSync(consumer, 'import { loadAdmin } from "./bridge";\nvoid loadAdmin;\n');

  try {
    assert.throws(
      () =>
        assertServiceRoleAllowlist({
          projectRoot,
          allowedConsumers: [
            "src/app/api/public/exam-attempts/[attemptId]/route.ts",
            "src/app/api/public/exams/[slug]/route.ts",
          ],
          entryFiles: [
            ...listTypeScriptFiles(resolve(projectRoot, "src")),
            consumer,
          ],
        }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes(bridge.replaceAll("\\", "/")) &&
        error.message.includes(consumer.replaceAll("\\", "/")),
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  assertServiceRoleAllowlist({
    projectRoot,
    allowedConsumers: [
      "src/app/api/public/exam-attempts/[attemptId]/route.ts",
      "src/app/api/public/exams/[slug]/route.ts",
    ],
  });
});

test("Ownership wird beim Schreiben ausschliesslich serverseitig ergänzt", () => {
  const routes = [
    "src/app/api/admin/categories/route.ts",
    "src/app/api/admin/questions/route.ts",
    "src/app/api/admin/quizzes/route.ts",
    "src/app/api/admin/exports/route.ts",
  ].map(readProjectFile).join("\n");
  const sync = readProjectFile("src/lib/admin-resource-sync.ts");

  assert.equal(routes.match(/auth\.user\.id/g)?.length, 4);
  assert.equal(
    sync.match(/user_id: userId,\s+(?:name|title|quizId):/g)?.length,
    4,
  );
  assert.doesNotMatch(routes, /data\.user_id|data\.userId/);
});

test("Ressourcen werden getrennt validiert und nicht mehr als Blob gespeichert", () => {
  const hook = readProjectFile("src/hooks/use-admin-state-sync.ts");
  const apiRoot = resolve(projectRoot, "src/app/api");
  const allApiSource = listTypeScriptFiles(apiRoot)
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  const mutationRoutes = [
    "categories",
    "topics",
    "questions",
    "quizzes",
    "exports",
    "exam-publications",
  ];
  const bodyProtectedRoutes = [
    ...mutationRoutes.map(
      (resource) => `src/app/api/admin/${resource}/route.ts`,
    ),
    "src/app/api/export/route.ts",
    "src/app/api/exam-results/send/route.ts",
    "src/app/api/import/route.ts",
  ];

  assert.doesNotMatch(hook, /\/api\/supabase/);
  assert.doesNotMatch(allApiSource, /syncAdminState|isQuizStatePayload/);
  for (const resource of mutationRoutes) {
    const route = readProjectFile(`src/app/api/admin/${resource}/route.ts`);
    assert.match(route, /parseJsonPayload\(request,/);
    assert.match(route, /PayloadSchema/);
  }
  for (const routePath of bodyProtectedRoutes) {
    const route = readProjectFile(routePath);
    const authIndex = Math.max(
      route.indexOf("authorizeAdminMutation(request"),
      route.indexOf("requireAdmin(request"),
    );
    const bodyIndexes = [
      route.indexOf("parseJsonPayload(request"),
      route.indexOf("readJsonBody(request"),
      route.indexOf("request.formData()"),
    ].filter((index) => index >= 0);
    assert.ok(authIndex >= 0, `${routePath} muss den Admin prüfen`);
    assert.ok(bodyIndexes.length > 0, `${routePath} muss einen Body lesen`);
    assert.ok(
      bodyIndexes.every((bodyIndex) => authIndex < bodyIndex),
      `${routePath} muss authentifizieren, bevor der Body gelesen wird`,
    );
  }
});

test("Upsert-Payloads wählen Datenbankfelder explizit aus", () => {
  const sync = readProjectFile("src/lib/admin-resource-sync.ts");
  assert.doesNotMatch(sync, /\.\.\.(category|topic|question|answer|quiz|record|publication)/);
  assert.match(sync, /id: publication\.id/);
  assert.match(sync, /questionOrderMode: publication\.randomization\.questionOrderMode/);
});

test("Rohe Datenbankfehler werden nicht an den Browser ausgegeben", () => {
  const adminApi = readProjectFile("src/lib/admin-api.ts");
  const resetRoute = readProjectFile(
    "src/app/api/admin/exam-attempts/[attemptId]/reset/route.ts",
  );
  const emailRoute = readProjectFile("src/app/api/exam-results/send/route.ts");

  assert.match(adminApi, /console\.error/);
  assert.doesNotMatch(resetRoute, /error: (readError|updateError|eventError)\.message/);
  assert.doesNotMatch(emailRoute, /error instanceof Error[\s\S]*?error\.message/);
});

test("localStorage ist nur Cache und überschreibt keinen leeren Remote-Stand", () => {
  const hook = readProjectFile("src/hooks/use-admin-state-sync.ts");
  const shell = readProjectFile("src/components/app-shell.tsx");

  assert.match(hook, /const remoteState = normalizeQuizState\(data\.state\)/);
  assert.match(hook, /readCachedAdminState/);
  assert.match(hook, /if \(!ready \|\| !remoteReady/);
  assert.doesNotMatch(hook, /remote\.quizzes\.length/);
  assert.doesNotMatch(hook, /addEventListener\("storage"/);
  assert.match(shell, /inert=\{lockContent\}/);
  assert.match(shell, /Der letzte Stand wird nur angezeigt/);
});

test("Einstellungsseite lädt nur den Serverstatus und lädt keinen lokalen Blob hoch", () => {
  const settings = readProjectFile("src/app/settings/page.tsx");

  assert.match(settings, /fetch\("\/api\/admin\/status"/);
  assert.doesNotMatch(settings, /method: "POST"/);
  assert.doesNotMatch(settings, /JSON\.stringify\(.*state/);
});
