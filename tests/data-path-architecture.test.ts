import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import test from "node:test";

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
    "src/app/api/supabase/route.ts",
    "src/app/api/exam-results/send/route.ts",
    "src/app/api/admin/exam-attempts/[attemptId]/reset/route.ts",
  ];

  for (const route of adminRoutes) {
    const source = readProjectFile(route);
    assert.match(source, /requireAdmin\(request\)/);
    assert.match(source, /auth\.client/);
    assert.doesNotMatch(source, /getSupabaseAdmin|supabase-admin/);
  }
});

test("Service Role bleibt auf die zwei öffentlichen Prüfungsendpunkte begrenzt", () => {
  const routeRoot = resolve(projectRoot, "src/app/api");
  const consumers = listTypeScriptFiles(routeRoot)
    .filter((path) => readFileSync(path, "utf8").includes("getSupabaseAdmin"))
    .map((path) => relative(projectRoot, path).replaceAll("\\", "/"))
    .sort();

  assert.deepEqual(consumers, [
    "src/app/api/public/exam-attempts/[attemptId]/route.ts",
    "src/app/api/public/exams/[slug]/route.ts",
  ]);
});

test("Ownership wird beim Schreiben ausschliesslich serverseitig ergänzt", () => {
  const route = readProjectFile("src/app/api/supabase/route.ts");
  const sync = readProjectFile("src/lib/admin-state-sync.ts");

  assert.match(route, /syncAdminState\(auth\.client, auth\.user\.id, payload\)/);
  assert.match(sync, /userId: string/);
  assert.equal(sync.match(/user_id: userId/g)?.length, 4);
  assert.doesNotMatch(route, /payload\.user_id|payload\.userId/);
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

  assert.match(settings, /fetch\("\/api\/supabase"/);
  assert.doesNotMatch(settings, /method: "POST"/);
  assert.doesNotMatch(settings, /JSON\.stringify\(.*state/);
});
