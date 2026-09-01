import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { assertServiceRoleAllowlist } from "./support/service-role-module-graph";

// Architekturhinweise: Quelltextprüfungen in dieser Datei dokumentieren Regeln,
// sind aber keine Laufzeitnachweise. Ausdrückliche Wächter-Selbsttests sind davon
// ausgenommen, weil sie den Fehlerfall tatsächlich ausführen.

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (path: string) =>
  readFileSync(resolve(projectRoot, path), "utf8");

const protectedRouteHandlers = [
  "src/app/api/admin/activity/route.ts",
  "src/app/api/admin/categories/route.ts",
  "src/app/api/admin/exam-publications/route.ts",
  "src/app/api/admin/exam-publications/[publicationId]/route.ts",
  "src/app/api/admin/exam-attempts/[attemptId]/reset/route.ts",
  "src/app/api/admin/exports/route.ts",
  "src/app/api/admin/questions/route.ts",
  "src/app/api/admin/quizzes/route.ts",
  "src/app/api/admin/state/route.ts",
  "src/app/api/admin/status/route.ts",
  "src/app/api/admin/topics/route.ts",
  "src/app/api/exam-results/send/route.ts",
  "src/app/api/export/route.ts",
  "src/app/api/import/route.ts",
] as const;

const authRouteHandlers = ["login", "logout", "reset"].map((route) =>
  resolve(projectRoot, `src/app/api/auth/${route}/route.ts`),
);
const allowedAuthServiceRoleConsumers = [
  "src/lib/rate-limit.ts",
  "src/app/api/auth/login/route.ts",
  "src/app/api/auth/reset/route.ts",
] as const;
const allowedDirectAuthServiceRoleConsumers = ["src/lib/rate-limit.ts"] as const;

test("Supabase SSR verwendet getrennte Browser- und Server-Clients", () => {
  const browserClient = readProjectFile("src/lib/supabase/client.ts");
  const serverClient = readProjectFile("src/lib/supabase/server.ts");
  const config = readProjectFile("src/lib/supabase/config.ts");

  assert.match(browserClient, /createBrowserClient/);
  assert.match(browserClient, /getSupabasePublicConfig/);
  assert.match(config, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(config, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(serverClient, /createServerClient/);
  assert.match(serverClient, /await cookies\(\)/);
  assert.match(serverClient, /getAll\(\)/);
  assert.match(serverClient, /setAll\(cookiesToSet\)/);
});

test("selbst verwaltete AlphaQuiz-Auth-Cookies wurden entfernt", () => {
  const files = [
    "src/proxy.ts",
    "src/lib/admin-auth.ts",
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/logout/route.ts",
  ];

  for (const file of files) {
    const source = readProjectFile(file);
    assert.doesNotMatch(source, /alphaquiz-(access|refresh)-token/);
  }
});

test("geschützte Route Handler prüfen die Session selbst mit getUser", () => {
  const adminAuth = readProjectFile("src/lib/admin-auth.ts");
  assert.match(adminAuth, /createSupabaseServerClient/);
  assert.match(adminAuth, /supabase\.auth\.getUser\(\)/);

  for (const route of protectedRouteHandlers) {
    assert.match(
      readProjectFile(route),
      /requireAdmin\(request\)|authorizeAdminMutation\(request\)/,
      `${route} muss die Admin-Sitzung selbst prüfen`,
    );
  }
});

test("Auth-Endpunkte erreichen die Service Role nur über das Rate-Limit", () => {
  assertServiceRoleAllowlist({
    projectRoot,
    allowedConsumers: allowedAuthServiceRoleConsumers,
    allowedDirectConsumers: allowedDirectAuthServiceRoleConsumers,
    entryFiles: authRouteHandlers,
  });

  for (const route of ["login", "logout", "reset"]) {
    const source = readProjectFile(`src/app/api/auth/${route}/route.ts`);
    assert.match(source, /createSupabaseServerClient/);
  }
});

test("Auth-Service-Role-Wächter beweist seinen Fehlerfall", () => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "alphaquiz-auth-service-role-guard-"),
  );
  const forbiddenRoute = join(temporaryDirectory, "route.ts");
  writeFileSync(
    forbiddenRoute,
    'import { getSupabaseAdmin } from "@/lib/supabase-admin";\nvoid getSupabaseAdmin;\n',
  );

  try {
    assert.throws(
      () =>
        assertServiceRoleAllowlist({
          projectRoot,
          allowedConsumers: allowedAuthServiceRoleConsumers,
          allowedDirectConsumers: allowedDirectAuthServiceRoleConsumers,
          entryFiles: [...authRouteHandlers, forbiddenRoute],
        }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes(forbiddenRoute.replaceAll("\\", "/")),
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  assertServiceRoleAllowlist({
    projectRoot,
    allowedConsumers: allowedAuthServiceRoleConsumers,
    allowedDirectConsumers: allowedDirectAuthServiceRoleConsumers,
    entryFiles: authRouteHandlers,
  });
});

test("Proxy ist nur UX-Redirect und ersetzt keine Handler-Autorisierung", () => {
  const proxy = readProjectFile("src/proxy.ts");
  assert.match(proxy, /supabase\.auth\.getUser\(\)/);
  assert.match(proxy, /optimistic UX redirect only/);
  assert.doesNotMatch(proxy, /SUPABASE_SERVICE_ROLE_KEY/);
});
