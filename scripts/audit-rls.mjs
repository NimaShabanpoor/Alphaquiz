import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const operations = ["select", "insert", "update", "delete"];
const policyCommands = {
  r: "select",
  a: "insert",
  w: "update",
  d: "delete",
};

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

function configuredValue(source, key) {
  return process.env[key]?.trim() || readEnvValue(source, key);
}

function deliberatelyDeniedOperations(comment) {
  const denied = new Set();
  const marker = /\[alphaquiz:rls-deny=([^\]]+)\]/gi;
  for (const match of comment.matchAll(marker)) {
    for (const value of match[1].split(",")) {
      const operation = value.trim().toLowerCase();
      if (operations.includes(operation)) denied.add(operation);
    }
  }
  return denied;
}

function policyOperations(command) {
  return command === "*" ? operations : [policyCommands[command]].filter(Boolean);
}

function usesDirectAuthUid(expression) {
  const normalized = expression.toLowerCase().replace(/\s+/g, " ");
  let offset = 0;
  while ((offset = normalized.indexOf("auth.uid()", offset)) !== -1) {
    const prefix = normalized.slice(Math.max(0, offset - 24), offset);
    if (!/select\s+$/.test(prefix)) return true;
    offset += "auth.uid()".length;
  }
  return false;
}

function isUnrestrictedUsing(expression) {
  return expression.toLowerCase().replace(/[\s()]/g, "") === "true";
}

const projectRoot = resolve(import.meta.dirname, "..");
const envSource = await readFile(resolve(projectRoot, ".env"), "utf8").catch(
  () => "",
);
const connectionString = configuredValue(envSource, "SUPABASE_URL");
const poolerHost = configuredValue(envSource, "SUPABASE_POOLER_HOST");
const apiUrl = configuredValue(envSource, "NEXT_PUBLIC_SUPABASE_URL");
const anonKey = configuredValue(
  envSource,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);

if (!connectionString.startsWith("postgres")) {
  throw new Error(
    "SUPABASE_URL muss eine PostgreSQL-Verbindungsadresse enthalten.",
  );
}
if (!apiUrl || !anonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
      "werden für die echte Anon-Probe benötigt.",
  );
}

const directUrl = new URL(connectionString);
const projectRef = directUrl.hostname.match(
  /^db\.([a-z0-9-]+)\.supabase\.co$/i,
)?.[1];
const client = new Client({
  ...(poolerHost && projectRef
    ? {
        host: poolerHost,
        port: 5432,
        database: "postgres",
        user: `postgres.${projectRef}`,
        password: decodeURIComponent(directUrl.password),
      }
    : { connectionString }),
  connectionTimeoutMillis: 15_000,
  ssl: ["localhost", "127.0.0.1", "::1"].includes(
    (poolerHost || directUrl.hostname).toLowerCase(),
  )
    ? false
    : { rejectUnauthorized: false },
});

try {
  await client.connect();

  const [tablesResult, policyColumnsResult, anonGrantsResult] = await Promise.all([
    client.query(`
      select
        relation.oid as table_oid,
        relation.relname as table_name,
        relation.relrowsecurity as rls_enabled,
        coalesce(obj_description(relation.oid, 'pg_class'), '') as table_comment,
        policy.polname as policy_name,
        policy.polcmd as policy_command,
        coalesce(array(
          select case
            when policy_role.role_oid = 0 then 'public'
            else pg_get_userbyid(policy_role.role_oid)
          end
          from unnest(policy.polroles) as policy_role(role_oid)
        ), array[]::text[]) as policy_roles,
        coalesce(pg_get_expr(policy.polqual, policy.polrelid), '') as using_expression,
        coalesce(pg_get_expr(policy.polwithcheck, policy.polrelid), '') as check_expression
      from pg_class as relation
      join pg_namespace as namespace
        on namespace.oid = relation.relnamespace
      left join pg_policy as policy
        on policy.polrelid = relation.oid
      where namespace.nspname = 'public'
        and relation.relkind in ('r', 'p')
      order by relation.relname, policy.polname
    `),
    client.query(`
      select distinct
        policy.polname as policy_name,
        policy_table.relname as policy_table,
        referenced_table.relname as referenced_table,
        attribute.attname as referenced_column,
        exists (
          select 1
          from pg_index as index_definition
          where index_definition.indrelid = dependency.refobjid
            and index_definition.indisvalid
            and index_definition.indisready
            and dependency.refobjsubid = any(index_definition.indkey)
        ) as has_index
      from pg_policy as policy
      join pg_class as policy_table
        on policy_table.oid = policy.polrelid
      join pg_namespace as policy_namespace
        on policy_namespace.oid = policy_table.relnamespace
      join pg_depend as dependency
        on dependency.classid = 'pg_policy'::regclass
        and dependency.objid = policy.oid
        and dependency.refclassid = 'pg_class'::regclass
        and dependency.refobjsubid > 0
      join pg_class as referenced_table
        on referenced_table.oid = dependency.refobjid
      join pg_namespace as referenced_namespace
        on referenced_namespace.oid = referenced_table.relnamespace
      join pg_attribute as attribute
        on attribute.attrelid = dependency.refobjid
        and attribute.attnum = dependency.refobjsubid
      where policy_namespace.nspname = 'public'
        and referenced_namespace.nspname = 'public'
      order by policy_table.relname, policy.polname,
        referenced_table.relname, attribute.attname
    `),
    client.query(`
      select table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'anon'
      order by table_name, privilege_type
    `),
  ]);

  const tables = new Map();
  for (const row of tablesResult.rows) {
    let table = tables.get(row.table_name);
    if (!table) {
      table = {
        name: row.table_name,
        rls: row.rls_enabled,
        denied: deliberatelyDeniedOperations(row.table_comment),
        policies: Object.fromEntries(
          operations.map((operation) => [operation, new Set()]),
        ),
      };
      tables.set(row.table_name, table);
    }
    if (!row.policy_name) continue;
    for (const operation of policyOperations(row.policy_command)) {
      table.policies[operation].add(row.policy_name);
    }
  }

  const report = [...tables.values()].map((table) => ({
    Tabelle: table.name,
    RLS: table.rls ? "ja" : "NEIN",
    SELECT:
      [...table.policies.select].join(", ") ||
      (table.denied.has("select") ? "bewusst verboten" : "FEHLT"),
    INSERT:
      [...table.policies.insert].join(", ") ||
      (table.denied.has("insert") ? "bewusst verboten" : "FEHLT"),
    UPDATE:
      [...table.policies.update].join(", ") ||
      (table.denied.has("update") ? "bewusst verboten" : "FEHLT"),
    DELETE:
      [...table.policies.delete].join(", ") ||
      (table.denied.has("delete") ? "bewusst verboten" : "FEHLT"),
  }));
  console.table(report);

  const failures = [];
  for (const table of tables.values()) {
    if (!table.rls) {
      failures.push(`${table.name}: RLS ist nicht aktiviert.`);
      continue;
    }
    for (const operation of operations) {
      if (
        table.policies[operation].size === 0 &&
        !table.denied.has(operation)
      ) {
        failures.push(
          `${table.name}: Policy für ${operation.toUpperCase()} fehlt. ` +
            `Absichtliches Verbot mit Tabellenkommentar ` +
            `"[alphaquiz:rls-deny=${operation}]" kennzeichnen.`,
        );
      }
    }
  }

  for (const row of tablesResult.rows) {
    if (!row.policy_name) continue;
    const expression = `${row.using_expression} ${row.check_expression}`;
    if (usesDirectAuthUid(expression)) {
      failures.push(
        `${row.table_name}.${row.policy_name}: verwendet auth.uid() ` +
          `ohne skalaren Unterselect (select auth.uid()).`,
      );
    }
    if (row.policy_roles.some((role) => ["anon", "public"].includes(role))) {
      failures.push(
        `${row.table_name}.${row.policy_name}: gilt für die anonyme Rolle ` +
          `(${row.policy_roles.join(", ")}).`,
      );
    }
    if (isUnrestrictedUsing(row.using_expression)) {
      failures.push(
        `${row.table_name}.${row.policy_name}: verwendet uneingeschränktes USING (true).`,
      );
    }
  }

  for (const row of anonGrantsResult.rows) {
    failures.push(
      `${row.table_name}: anon besitzt ${row.privilege_type} auf einer public-Tabelle.`,
    );
  }

  for (const row of policyColumnsResult.rows) {
    if (!row.has_index) {
      failures.push(
        `${row.policy_table}.${row.policy_name}: Policy-Spalte ` +
          `${row.referenced_table}.${row.referenced_column} hat keinen Index.`,
      );
    }
  }

  const anonClient = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonProbeReport = [];
  for (const table of tables.values()) {
    const { error } = await anonClient.from(table.name).select("*").limit(1);
    const denied = Boolean(error);
    anonProbeReport.push({
      Tabelle: table.name,
      "Anon-SELECT": denied ? "abgewiesen" : "OFFEN",
    });
    if (!denied) {
      failures.push(
        `${table.name}: echte SELECT-Abfrage mit dem Anon-Key war möglich.`,
      );
    }
  }
  console.table(anonProbeReport);

  if (failures.length > 0) {
    console.error("\nRLS-Prüfung fehlgeschlagen:");
    for (const failure of [...new Set(failures)]) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log("RLS-Prüfung erfolgreich.");
  }
} finally {
  await client.end().catch(() => undefined);
}
