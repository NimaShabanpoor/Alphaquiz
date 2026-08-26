import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const schema = readFileSync(
  resolve(projectRoot, "supabase", "schema.sql"),
  "utf8",
);
const migration = readFileSync(
  resolve(
    projectRoot,
    "supabase",
    "migrations",
    "20260826000000_user_ownership_rls.sql",
  ),
  "utf8",
);

const publicTables = [
  "categories",
  "topics",
  "questions",
  "answers",
  "quizzes",
  "quiz_questions",
  "exports",
  "exam_publications",
  "exam_attempts",
  "exam_instances",
  "exam_events",
] as const;

const directlyOwnedTables = [
  "categories",
  "questions",
  "quizzes",
  "exports",
] as const;

test("direkt verwaltete Tabellen haben eine verpflichtende Auth-Ownership", () => {
  for (const table of directlyOwnedTables) {
    const createTable = schema.match(
      new RegExp(
        `create table if not exists public\\.${table} \\(([\\s\\S]*?)\\n\\);`,
      ),
    )?.[1];

    assert.ok(createTable, `CREATE TABLE für ${table} fehlt`);
    assert.match(
      createTable,
      /user_id uuid not null references auth\.users\(id\)/,
      `${table}.user_id ist nicht NOT NULL oder referenziert auth.users nicht`,
    );
    assert.match(
      schema,
      new RegExp(
        `create index if not exists ${table}_user_id_idx on public\\.${table} \\(user_id\\)`,
      ),
      `Index auf ${table}.user_id fehlt`,
    );

    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${table} alter column user_id set not null`,
      ),
    );
    assert.match(
      migration,
      new RegExp(`foreign key \\(user_id\\) references auth\\.users\\(id\\)`),
    );
  }
});

test("Legacy-Ownership wird vor den user_id-Indexen nachgerüstet", () => {
  for (const table of directlyOwnedTables) {
    const addColumnPosition = schema.indexOf(
      `alter table public.${table} add column if not exists user_id uuid`,
    );
    const indexPosition = schema.indexOf(
      `create index if not exists ${table}_user_id_idx`,
    );

    assert.notEqual(addColumnPosition, -1, `Legacy-Upgrade für ${table} fehlt`);
    assert.notEqual(indexPosition, -1, `user_id-Index für ${table} fehlt`);
    assert.ok(
      addColumnPosition < indexPosition,
      `${table}.user_id muss vor dem Index angelegt werden`,
    );
  }

  assert.match(schema, /AlphaQuiz ownership migration requires exactly one Auth user/);
  assert.match(schema, /update public\.categories set user_id = legacy_owner_id/);
});

test("jede öffentliche AlphaQuiz-Tabelle aktiviert RLS und erhält CRUD-Policies", () => {
  for (const table of publicTables) {
    for (const sql of [schema, migration]) {
      assert.match(
        sql,
        new RegExp(
          `alter table public\\.${table} enable row level security`,
        ),
        `RLS fehlt für ${table}`,
      );
      assert.match(
        sql,
        new RegExp(`\\(\\s*'${table}',`),
        `Ownership-Regel fehlt für ${table}`,
      );
    }
  }

  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(
      migration,
      new RegExp(`create policy %I on public\\.%I for ${operation}`),
      `${operation.toUpperCase()}-Policy-Generator fehlt`,
    );
  }
});

test("Child-Tabellen prüfen Ownership über ihre Parent-Zeilen", () => {
  assert.match(
    migration,
    /'answers',[\s\S]*?'exists \(select 1 from public\.questions/,
  );
  assert.match(
    migration,
    /'quiz_questions',[\s\S]*?'exists \(select 1 from public\.quizzes[\s\S]*?exists \(select 1 from public\.questions/,
  );
});

test("Migration bricht bei RLS- oder Policy-Lücken ab", () => {
  assert.match(migration, /Public tables without RLS/);
  assert.match(migration, /Missing CRUD RLS policies/);
  assert.match(migration, /values \('r', 'select'\), \('a', 'insert'\), \('w', 'update'\), \('d', 'delete'\)/);
});

test("authenticated erhält nur CRUD-Rechte und anon keine Tabellenrechte", () => {
  assert.match(
    migration,
    /revoke all on all tables in schema public from anon, authenticated/,
  );
  assert.match(
    migration,
    /grant select, insert, update, delete on table[\s\S]*?to authenticated/,
  );
});
