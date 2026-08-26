import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (path: string) =>
  readFileSync(resolve(projectRoot, path), "utf8");

const protectedRouteHandlers = [
  "src/app/api/admin/exam-attempts/[attemptId]/reset/route.ts",
  "src/app/api/exam-results/send/route.ts",
  "src/app/api/export/route.ts",
  "src/app/api/import/route.ts",
  "src/app/api/supabase/route.ts",
] as const;

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
      /requireAdmin\(request\)/,
      `${route} muss requireAdmin(request) aufrufen`,
    );
  }
});

test("Auth-Endpunkte verwenden nie den Service-Role-Client", () => {
  for (const route of ["login", "logout", "reset"]) {
    const source = readProjectFile(`src/app/api/auth/${route}/route.ts`);
    assert.doesNotMatch(source, /supabase-admin|getSupabaseAdmin/);
    assert.match(source, /createSupabaseServerClient/);
  }
});

test("Proxy ist nur UX-Redirect und ersetzt keine Handler-Autorisierung", () => {
  const proxy = readProjectFile("src/proxy.ts");
  assert.match(proxy, /supabase\.auth\.getUser\(\)/);
  assert.match(proxy, /optimistic UX redirect only/);
  assert.doesNotMatch(proxy, /SUPABASE_SERVICE_ROLE_KEY/);
});
