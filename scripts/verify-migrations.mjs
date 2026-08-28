import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import {
  collectSchemaInventory,
  printSchemaInventorySummary,
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
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const client = new Client({ connectionString, ssl: false });
const results = [];

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
  const inventory = await collectSchemaInventory(client);
  printSchemaInventorySummary(inventory);
  await writeSchemaInventory(inventoryPath, inventory);
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
