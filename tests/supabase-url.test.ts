import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSupabaseUrl,
  resolveSupabaseUrl,
} from "../src/lib/supabase/url";

test("akzeptiert jede gültige HTTPS-Projektadresse", () => {
  assert.equal(
    normalizeSupabaseUrl("https://supabase.internal.example/api/"),
    "https://supabase.internal.example",
  );
});

test("akzeptiert lokale HTTP-Projektadressen", () => {
  assert.equal(
    normalizeSupabaseUrl("http://127.0.0.1:54321"),
    "http://127.0.0.1:54321",
  );
  assert.equal(
    normalizeSupabaseUrl("http://localhost:54321/"),
    "http://localhost:54321",
  );
});

test("lehnt externe HTTP-Projektadressen ab", () => {
  assert.equal(normalizeSupabaseUrl("http://supabase.example.com"), null);
  assert.equal(normalizeSupabaseUrl("http://192.168.1.10:54321"), null);
});

test("leitet gehostete Projektadressen aus PostgreSQL-Adressen ab", () => {
  assert.equal(
    normalizeSupabaseUrl(
      "postgresql://postgres:secret@db.project-ref.supabase.co:5432/postgres",
    ),
    "https://project-ref.supabase.co",
  );
  assert.equal(
    normalizeSupabaseUrl(
      "postgresql://postgres.project-ref:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
    ),
    "https://project-ref.supabase.co",
  );
});

test("verwendet für alle Clients den ersten gültigen konfigurierten Wert", () => {
  assert.equal(
    resolveSupabaseUrl(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      "http://127.0.0.1:54321",
    ),
    "http://127.0.0.1:54321",
  );
});
