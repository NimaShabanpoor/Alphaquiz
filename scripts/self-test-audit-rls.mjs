import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

const execFileAsync = promisify(execFile);

function readEnvValue(source, key) {
  const line = source
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));
  if (!line) return "";
  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const projectRoot = resolve(import.meta.dirname, "..");
const envSource = await readFile(resolve(projectRoot, ".env"), "utf8").catch(
  () => "",
);
const connectionString =
  process.env.SUPABASE_URL?.trim() || readEnvValue(envSource, "SUPABASE_URL");

if (process.env.RLS_AUDIT_SELF_TEST !== "1") {
  throw new Error(
    "Die RLS-Audit-Selbstprüfung darf nur mit RLS_AUDIT_SELF_TEST=1 laufen.",
  );
}
if (!connectionString.startsWith("postgres")) {
  throw new Error(
    "SUPABASE_URL muss für die Selbstprüfung eine PostgreSQL-Adresse sein.",
  );
}

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 15_000,
  ssl: ["localhost", "127.0.0.1", "::1"].includes(
    new URL(connectionString).hostname.toLowerCase(),
  )
    ? false
    : { rejectUnauthorized: false },
});
let connected = false;
const dropFixtures = `
  drop table if exists public.__alphaquiz_audit_rls_off cascade;
  drop table if exists public.__alphaquiz_audit_using_true cascade;
  drop table if exists public.__alphaquiz_audit_anon_policy cascade;
  drop table if exists public.__alphaquiz_audit_anon_grant cascade;
  drop table if exists public.__alphaquiz_audit_unindexed cascade;
`;

try {
  await client.connect();
  connected = true;
  await client.query(dropFixtures);
  await client.query(`
    create table public.__alphaquiz_audit_rls_off (
      id text primary key
    );

    create table public.__alphaquiz_audit_using_true (
      id text primary key
    );
    alter table public.__alphaquiz_audit_using_true enable row level security;
    comment on table public.__alphaquiz_audit_using_true is
      '[alphaquiz:rls-deny=insert,update,delete]';
    create policy __alphaquiz_selftest_using_true
      on public.__alphaquiz_audit_using_true
      for select to authenticated
      using (true);

    create table public.__alphaquiz_audit_anon_policy (
      id text primary key
    );
    alter table public.__alphaquiz_audit_anon_policy enable row level security;
    comment on table public.__alphaquiz_audit_anon_policy is
      '[alphaquiz:rls-deny=insert,update,delete]';
    create policy __alphaquiz_selftest_anon_policy
      on public.__alphaquiz_audit_anon_policy
      for select to anon
      using (id is not null);

    create table public.__alphaquiz_audit_anon_grant (
      id text primary key
    );
    alter table public.__alphaquiz_audit_anon_grant enable row level security;
    comment on table public.__alphaquiz_audit_anon_grant is
      '[alphaquiz:rls-deny=select,insert,update,delete]';
    grant select on table public.__alphaquiz_audit_anon_grant to anon;

    create table public.__alphaquiz_audit_unindexed (
      id text primary key,
      owner_id uuid
    );
    alter table public.__alphaquiz_audit_unindexed enable row level security;
    comment on table public.__alphaquiz_audit_unindexed is
      '[alphaquiz:rls-deny=insert,update,delete]';
    create policy __alphaquiz_selftest_unindexed
      on public.__alphaquiz_audit_unindexed
      for select to authenticated
      using (owner_id = (select auth.uid()));

    notify pgrst, 'reload schema';
  `);

  let output = "";
  let auditFailed = false;
  try {
    const result = await execFileAsync(
      process.execPath,
      [resolve(projectRoot, "scripts/audit-rls.mjs")],
      { cwd: projectRoot, env: process.env },
    );
    output = `${result.stdout}\n${result.stderr}`;
  } catch (error) {
    auditFailed = true;
    output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  }

  const expectations = [
    {
      Fall: "RLS deaktiviert",
      marker: "__alphaquiz_audit_rls_off: RLS ist nicht aktiviert.",
    },
    {
      Fall: "USING (true)",
      marker:
        "__alphaquiz_audit_using_true.__alphaquiz_selftest_using_true: " +
        "verwendet uneingeschränktes USING (true).",
    },
    {
      Fall: "Policy für anon",
      marker:
        "__alphaquiz_audit_anon_policy.__alphaquiz_selftest_anon_policy: " +
        "gilt für die anonyme Rolle",
    },
    {
      Fall: "GRANT an anon",
      marker:
        "__alphaquiz_audit_anon_grant: anon besitzt SELECT auf einer public-Tabelle.",
    },
    {
      Fall: "Policy-Spalte ohne Index",
      marker:
        "__alphaquiz_audit_unindexed.__alphaquiz_selftest_unindexed: " +
        "Policy-Spalte __alphaquiz_audit_unindexed.owner_id hat keinen Index.",
    },
  ];
  const report = expectations.map(({ Fall, marker }) => ({
    Fall,
    Ergebnis: output.includes(marker) ? "erkannt" : "FEHLT",
  }));
  console.table(report);

  const missing = expectations.filter(({ marker }) => !output.includes(marker));
  if (!auditFailed || missing.length > 0) {
    console.error(output);
    throw new Error(
      !auditFailed
        ? "Das Audit hat die absichtlich unsichere Datenbank akzeptiert."
        : `Das Audit hat ${missing.length} von 5 Testfehlern nicht erkannt.`,
    );
  }
  console.log("RLS-Audit-Selbstprüfung erfolgreich: 5 von 5 erkannt.");
} finally {
  if (connected) {
    await client.query(dropFixtures).catch(() => undefined);
    await client.query("notify pgrst, 'reload schema'").catch(() => undefined);
  }
  await client.end().catch(() => undefined);
}
