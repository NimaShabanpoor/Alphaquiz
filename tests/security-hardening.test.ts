import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (path: string) =>
  readFileSync(resolve(projectRoot, path), "utf8");

test("Passwort-Redirect und Mutationen verwenden die feste APP_ORIGIN", () => {
  const reset = readProjectFile("src/app/api/auth/reset/route.ts");
  const adminAuth = readProjectFile("src/lib/admin-auth.ts");
  const appOrigin = readProjectFile("src/lib/app-origin.ts");

  assert.match(reset, /getAppOrigin\(\)/);
  assert.doesNotMatch(reset, /new URL\(request\.url\)\.origin/);
  assert.match(adminAuth, /trustedMutationOrigin\(request\)/);
  assert.match(appOrigin, /process\.env\.APP_ORIGIN/);
  assert.match(appOrigin, /url\.protocol !== "https:"/);
});

test("CSP läuft vor der Durchsetzung im Report-Only-Modus", () => {
  const config = readProjectFile("next.config.ts");
  assert.match(config, /Content-Security-Policy-Report-Only/);
  assert.doesNotMatch(config, /key: "Content-Security-Policy",/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /object-src 'none'/);
});

test("Rate-Limit-Schlüssel werden vor dem atomaren RPC-Aufruf gehasht", () => {
  const rateLimit = readProjectFile("src/lib/rate-limit.ts");

  assert.match(rateLimit, /client\.rpc\("consume_rate_limit"/);
  assert.match(rateLimit, /createHmac\("sha256"/);
  assert.match(rateLimit, /process\.env\.VERCEL/);
  assert.match(rateLimit, /checkIdentifierRateLimit/);
  assert.match(rateLimit, /identifier\.trim\(\)\.toLowerCase\(\)/);
});

test("RLS-Audit prüft Grants, Policy-Rollen und echte Anon-Abfragen", () => {
  const audit = readProjectFile("scripts/audit-rls.mjs");

  assert.match(audit, /information_schema\.role_table_grants/);
  assert.match(audit, /grantee = 'anon'/);
  assert.match(audit, /policy\.polroles::regrole\[\]::text\[\]/);
  assert.match(audit, /\["anon", "public", "0"\]/);
  assert.match(audit, /isUnrestrictedUsing\(row\.using_expression\)/);
  assert.match(audit, /createClient\(apiUrl, anonKey/);
  assert.match(audit, /\.from\(table\.name\)\.select\("\*"\)\.limit\(1\)/);
});

test("RLS-Audit beweist seine fünf Fehlerklassen vor dem echten Lauf", () => {
  const selfTest = readProjectFile("scripts/self-test-audit-rls.mjs");
  const workflow = readProjectFile(".github/workflows/ci.yml");
  const packageJson = readProjectFile("package.json");

  assert.match(selfTest, /__alphaquiz_audit_rls_off/);
  assert.match(selfTest, /using \(true\)/);
  assert.match(selfTest, /for select to anon/);
  assert.match(selfTest, /grant select on table[\s\S]*to anon/);
  assert.match(selfTest, /__alphaquiz_audit_unindexed/);
  assert.match(selfTest, /5 von 5 erkannt/);
  assert.match(packageJson, /"db:audit-rls:self-test"/);
  assert.ok(
    workflow.indexOf("npm run db:audit-rls:self-test") <
      workflow.lastIndexOf("run: npm run db:audit-rls"),
    "Die Selbstprüfung muss vor dem echten Audit laufen.",
  );
});

test("Vollersatz-Löschungen werden mit Benutzer und Anzahl protokolliert", () => {
  const sync = readProjectFile("src/lib/admin-resource-sync.ts");

  assert.match(sync, /\[AlphaQuiz Datenlöschung\]/);
  assert.match(sync, /type: table/);
  assert.match(sync, /count: missing\.length/);
  assert.match(sync, /user_id: userId/);
  assert.match(sync, /timestamp: new Date\(\)\.toISOString\(\)/);
});

test("Import, Export und Ergebnis-E-Mail sind begrenzt und gedrosselt", () => {
  const importRoute = readProjectFile("src/app/api/import/route.ts");
  const exportRoute = readProjectFile("src/app/api/export/route.ts");
  const emailRoute = readProjectFile("src/app/api/exam-results/send/route.ts");

  assert.match(importRoute, /25 \* 1024 \* 1024/);
  assert.match(importRoute, /hasAccessSignature/);
  assert.match(importRoute, /questionsArraySchema\.safeParse/);
  assert.match(exportRoute, /readJsonBody\(request, 30 \* 1024 \* 1024\)/);
  assert.match(exportRoute, /exportPayloadSchema\.safeParse/);
  assert.match(exportRoute, /\^\[\\t\\r\\n\]\*\[=\+\\-@\]/);
  for (const route of [importRoute, exportRoute, emailRoute]) {
    assert.match(route, /await checkRateLimit\(/);
  }
});

test("Die Admin-Oberfläche unterstützt Tastatur und reduzierte Bewegung", () => {
  const shell = readProjectFile("src/components/app-shell.tsx");
  const shellCss = readProjectFile("src/components/app-shell.module.css");
  const globalCss = readProjectFile("src/app/globals.css");

  assert.match(shell, /href="#main-content"/);
  assert.match(shell, /id="main-content"/);
  assert.match(shell, /aria-live="polite"/);
  assert.match(shellCss, /\.skipLink:focus/);
  assert.match(globalCss, /:focus-visible/);
  assert.match(globalCss, /prefers-reduced-motion: reduce/);
});
