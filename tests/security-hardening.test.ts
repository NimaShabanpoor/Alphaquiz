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

test("Rate Limits werden atomar in einem privaten Schema gespeichert", () => {
  const rateLimit = readProjectFile("src/lib/rate-limit.ts");
  const schema = readProjectFile("supabase/schema.sql");
  const migration = readProjectFile(
    "supabase/migrations/20260826010000_durable_rate_limits.sql",
  );

  assert.match(rateLimit, /client\.rpc\("consume_rate_limit"/);
  assert.match(rateLimit, /createHmac\("sha256"/);
  for (const sql of [schema, migration]) {
    assert.match(sql, /create schema if not exists private/);
    assert.match(sql, /private\.request_rate_limits/);
    assert.match(sql, /security definer/);
    assert.match(sql, /set search_path = private, pg_temp/);
    assert.match(sql, /revoke all on table private\.request_rate_limits/);
  }
});

test("Import, Export und Ergebnis-E-Mail sind begrenzt und gedrosselt", () => {
  const importRoute = readProjectFile("src/app/api/import/route.ts");
  const exportRoute = readProjectFile("src/app/api/export/route.ts");
  const emailRoute = readProjectFile("src/app/api/exam-results/send/route.ts");

  assert.match(importRoute, /25 \* 1024 \* 1024/);
  assert.match(importRoute, /hasAccessSignature/);
  assert.match(importRoute, /questionsPayloadSchema\.safeParse/);
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
