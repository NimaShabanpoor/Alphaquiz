import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import {
  collectSchemaInventory,
  printSchemaInventorySummary,
  withoutSupabasePlatformObjects,
  writeSchemaInventory,
} from "./schema-inventory.mjs";

const connectionString = process.env.MIGRATION_DATABASE_URL?.trim();
if (!connectionString?.startsWith("postgres")) {
  throw new Error(
    "MIGRATION_DATABASE_URL muss eine PostgreSQL-Verbindungsadresse enthalten.",
  );
}

const databaseUrl = new URL(connectionString);
if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname)) {
  throw new Error(
    "Migrationsprüfung verweigert eine nicht-lokale Datenbank. " +
      "Verwende ausschliesslich die CI-Wegwerfinstanz.",
  );
}

const projectRoot = resolve(import.meta.dirname, "..");
const migrationsDirectory = resolve(projectRoot, "supabase", "migrations");
const bootstrapPath = resolve(projectRoot, "supabase", "ci-bootstrap.sql");
const inventoryPath = resolve(projectRoot, "migration-schema-inventory.json");
const referenceInventoryPath = resolve(
  projectRoot,
  "supabase",
  "dev-schema-inventory.json",
);
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const client = new Client({ connectionString, ssl: false });
const results = [];
const verificationFailures = [];

const comparedSections = [
  "tables",
  "columns",
  "constraints",
  "indexes",
  "policies",
  "tableGrants",
  "routineGrants",
  "schemaGrants",
  "functions",
];

function compareInventory(reference, actual) {
  const differences = [];
  for (const section of comparedSections) {
    const referenceEntries = new Set(
      (reference[section] ?? []).map((entry) => JSON.stringify(entry)),
    );
    const actualEntries = new Set(
      (actual[section] ?? []).map((entry) => JSON.stringify(entry)),
    );
    for (const entry of referenceEntries) {
      if (!actualEntries.has(entry)) {
        differences.push({ Bereich: section, Seite: "nur Dev", Objekt: entry });
      }
    }
    for (const entry of actualEntries) {
      if (!referenceEntries.has(entry)) {
        differences.push({ Bereich: section, Seite: "nur Baseline", Objekt: entry });
      }
    }
  }
  return differences;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function expectAnonDenied(label, statement) {
  await client.query("begin");
  try {
    await client.query("set local role anon");
    await client.query(statement);
    verificationFailures.push(`${label}: anonymer Zugriff war möglich.`);
  } catch (error) {
    if (error?.code !== "42501") {
      verificationFailures.push(
        `${label}: erwartete 42501, erhielt ${error?.code ?? "unbekannt"} (${error instanceof Error ? error.message : String(error)}).`,
      );
    }
  } finally {
    await client.query("rollback").catch(() => undefined);
  }
}

async function runAnonProbe(inventory) {
  const report = [];
  for (const table of inventory.tables) {
    const name = `"${table.schema}"."${table.name}"`;
    const firstColumn = inventory.columns.find(
      (column) =>
        column.schema === table.schema && column.table === table.name,
    )?.column;
    if (!firstColumn) {
      verificationFailures.push(
        `${table.schema}.${table.name}: keine Spalte für die UPDATE-Probe gefunden.`,
      );
      continue;
    }
    const updateColumn = quoteIdentifier(firstColumn);
    const statements = {
      SELECT: `select * from ${name} limit 0`,
      INSERT: `insert into ${name} default values`,
      UPDATE: `update ${name} set ${updateColumn} = ${updateColumn} where false`,
      DELETE: `delete from ${name} where false`,
    };
    for (const [operation, statement] of Object.entries(statements)) {
      const before = verificationFailures.length;
      await expectAnonDenied(`${table.schema}.${table.name} ${operation}`, statement);
      report.push({
        Objekt: `${table.schema}.${table.name}`,
        Operation: operation,
        Ergebnis: verificationFailures.length === before ? "abgewiesen" : "FEHLER",
      });
    }
  }

  await client.query(`
    create table public.__alphaquiz_future_table (id integer);
    create sequence public.__alphaquiz_future_sequence;
    create function public.__alphaquiz_future_function()
      returns integer language sql as 'select 1';
  `);
  for (const [label, statement] of [
    ["künftige Tabelle", "select * from public.__alphaquiz_future_table"],
    ["künftige Sequenz", "select nextval('public.__alphaquiz_future_sequence')"],
    ["künftige Funktion", "select public.__alphaquiz_future_function()"],
  ]) {
    const before = verificationFailures.length;
    await expectAnonDenied(label, statement);
    report.push({
      Objekt: label,
      Operation: "DEFAULT PRIVILEGES",
      Ergebnis: verificationFailures.length === before ? "abgewiesen" : "FEHLER",
    });
  }
  await client.query(`
    drop function public.__alphaquiz_future_function();
    drop sequence public.__alphaquiz_future_sequence;
    drop table public.__alphaquiz_future_table;
  `);
  console.table(report);
}

try {
  await client.connect();
  await client.query(await readFile(bootstrapPath, "utf8"));

  for (const file of migrationFiles) {
    try {
      await client.query(await readFile(resolve(migrationsDirectory, file), "utf8"));
      results.push({ Migration: file, Status: "OK", Code: "", Fehler: "" });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      results.push({
        Migration: file,
        Status: "FEHLER",
        Code: error?.code ?? "unbekannt",
        Fehler: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.table(results);
  const inventory = withoutSupabasePlatformObjects(
    await collectSchemaInventory(client),
  );
  printSchemaInventorySummary(inventory);
  await writeSchemaInventory(inventoryPath, inventory);

  const referenceInventory = JSON.parse(
    await readFile(referenceInventoryPath, "utf8"),
  );
  const differences = compareInventory(referenceInventory, inventory);
  if (differences.length > 0) {
    console.error("\nSchema-Abweichungen zwischen Dev und Baseline:");
    console.table(differences);
    verificationFailures.push(
      `${differences.length} Schema-Abweichungen zwischen Dev und Baseline.`,
    );
  } else {
    console.log("Dev/Baseline-Diff: keine Abweichungen in den geprüften Bereichen.");
  }

  await runAnonProbe(inventory);
} finally {
  await client.end().catch(() => undefined);
}

const failures = results.filter((result) => result.Status === "FEHLER");
if (failures.length > 0) {
  console.error(`Migrationskette enthält ${failures.length} Fehler.`);
  process.exitCode = 1;
} else {
  console.log("Migrationskette vollständig erfolgreich.");
}

if (verificationFailures.length > 0) {
  console.error("\nVerifikation fehlgeschlagen:");
  for (const failure of verificationFailures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Schema-Diff und Anon-Probe erfolgreich.");
}
