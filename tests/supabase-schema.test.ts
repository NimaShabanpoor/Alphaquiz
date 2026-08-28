import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const migrationsDirectory = resolve(projectRoot, "supabase", "migrations");
const baseline = readFileSync(
  resolve(migrationsDirectory, "00000000000000_baseline.sql"),
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
    const createTable = baseline.match(
      new RegExp(
        `create table "public"\\."${table}" \\(([\\s\\S]*?)\\n\\);`,
      ),
    )?.[1];

    assert.ok(createTable, `CREATE TABLE für ${table} fehlt`);
    assert.match(
      createTable,
      /"user_id" uuid not null/,
      `${table}.user_id ist nicht NOT NULL`,
    );
    assert.match(
      baseline,
      new RegExp(`CREATE INDEX ${table}_user_id_idx ON public\\.${table}`),
      `Index auf ${table}.user_id fehlt`,
    );

    assert.match(
      baseline,
      new RegExp(
        `add constraint "${table}_user_id_fkey" FOREIGN KEY \\(user_id\\) REFERENCES auth\\.users\\(id\\)`,
      ),
    );
  }
});

test("genau eine Baseline ist die Migrationsquelle", () => {
  assert.deepEqual(
    readdirSync(migrationsDirectory).filter((file) => file.endsWith(".sql")),
    ["00000000000000_baseline.sql"],
  );
});

test("jede öffentliche AlphaQuiz-Tabelle aktiviert RLS und erhält CRUD-Policies", () => {
  for (const table of publicTables) {
    assert.match(
      baseline,
      new RegExp(
        `alter table "public"\\."${table}" enable row level security`,
      ),
      `RLS fehlt für ${table}`,
    );
    for (const operation of ["select", "insert", "update", "delete"]) {
      assert.match(
        baseline,
        new RegExp(
          `create policy "${table}_${operation}_own"[\\s\\S]*?for ${operation}`,
        ),
        `${operation.toUpperCase()}-Policy fehlt für ${table}`,
      );
    }
  }
});

test("Child-Tabellen prüfen Ownership über ihre Parent-Zeilen", () => {
  assert.match(
    baseline,
    /create policy "answers_select_own"[\s\S]*?FROM questions question/,
  );
  assert.match(
    baseline,
    /create policy "quiz_questions_select_own"[\s\S]*?FROM quizzes quiz[\s\S]*?FROM questions question/,
  );
});

test("Default-Rechte halten künftige Objekte für anon geschlossen", () => {
  assert.match(
    baseline,
    /alter default privileges in schema public revoke all on tables from anon/,
  );
  assert.match(
    baseline,
    /alter default privileges in schema public revoke all on sequences from anon/,
  );
  assert.match(
    baseline,
    /alter default privileges in schema public revoke all on functions from anon/,
  );
  assert.match(
    baseline,
    /alter default privileges in schema public revoke all on functions from public/,
  );
  assert.match(
    baseline,
    /alter default privileges revoke all on functions from public/,
  );
});

test("authenticated erhält nur CRUD-Rechte und anon keine Tabellenrechte", () => {
  assert.match(
    baseline,
    /revoke all on all tables in schema public from anon, authenticated/,
  );
  for (const table of publicTables) {
    assert.match(
      baseline,
      new RegExp(
        `grant delete, insert, select, update on table "public"\\."${table}" to "authenticated"`,
      ),
    );
  }
});
