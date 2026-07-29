import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

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
const [envSource, schema] = await Promise.all([
  readFile(resolve(projectRoot, ".env"), "utf8"),
  readFile(resolve(projectRoot, "supabase", "schema.sql"), "utf8"),
]);
const connectionString = readEnvValue(envSource, "SUPABASE_URL");
const poolerHost = readEnvValue(envSource, "SUPABASE_POOLER_HOST");

if (!connectionString.startsWith("postgres")) {
  throw new Error(
    "SUPABASE_URL muss für die Einrichtung eine PostgreSQL-Verbindungsadresse enthalten.",
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
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query("begin");
  await client.query(schema);
  await client.query("commit");

  const result = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'categories',
        'questions',
        'answers',
        'quizzes',
        'quiz_questions',
        'exports'
      )
    order by table_name
  `);
  console.log(
    `Supabase-Schema bereit: ${result.rows
      .map((row) => row.table_name)
      .join(", ")}`,
  );
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
