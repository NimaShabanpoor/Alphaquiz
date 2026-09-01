import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

// Architekturhinweise: Diese Quelltextprüfungen dokumentieren die erwartete
// Ownership-Struktur. Der wirksame Datenbanknachweis erfolgt separat durch das
// Migrationsinventar, das RLS-Audit und die Autorisierungstests in CI.

const projectRoot = resolve(import.meta.dirname, "..");
const migrationsDirectory = resolve(projectRoot, "supabase", "migrations");
const baseline = readFileSync(
  resolve(migrationsDirectory, "00000000000000_baseline.sql"),
  "utf8",
);

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
