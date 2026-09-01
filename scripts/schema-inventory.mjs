import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Client } from "pg";

export async function collectSchemaInventory(client) {
  const queries = {
    tables: `
      select
        namespace.nspname as schema,
        relation.relname as name,
        relation.relrowsecurity as rls,
        relation.relforcerowsecurity as force_rls
      from pg_class as relation
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname in ('public', 'private')
        and relation.relkind in ('r', 'p')
      order by namespace.nspname, relation.relname
    `,
    columns: `
      select
        table_schema as schema,
        table_name as table,
        column_name as column,
        data_type,
        udt_name,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema in ('public', 'private')
      order by table_schema, table_name, ordinal_position
    `,
    constraints: `
      select
        namespace.nspname as schema,
        relation.relname as table,
        constraint_definition.conname as name,
        constraint_definition.contype as type,
        pg_get_constraintdef(constraint_definition.oid, true) as definition
      from pg_constraint as constraint_definition
      join pg_class as relation on relation.oid = constraint_definition.conrelid
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname in ('public', 'private')
      order by namespace.nspname, relation.relname, constraint_definition.conname
    `,
    indexes: `
      select schemaname as schema, tablename as table, indexname as name, indexdef as definition
      from pg_indexes
      where schemaname in ('public', 'private')
      order by schemaname, tablename, indexname
    `,
    policies: `
      select
        schemaname as schema,
        tablename as table,
        policyname as name,
        roles,
        cmd,
        qual,
        with_check
      from pg_policies
      where schemaname in ('public', 'private')
      order by schemaname, tablename, policyname
    `,
    tableGrants: `
      select table_schema as schema, table_name as table, grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema in ('public', 'private')
        and grantee in ('anon', 'authenticated', 'service_role')
      order by table_schema, table_name, grantee, privilege_type
    `,
    routineGrants: `
      select routine_schema as schema, routine_name as routine, grantee, privilege_type
      from information_schema.role_routine_grants
      where routine_schema in ('public', 'private')
        and grantee in ('anon', 'authenticated', 'service_role')
      order by routine_schema, routine_name, grantee, privilege_type
    `,
    schemaGrants: `
      select namespace.nspname as schema, role_definition.rolname as grantee,
        privilege.privilege_type
      from pg_namespace as namespace
      cross join lateral aclexplode(
        coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))
      ) as privilege
      join pg_roles as role_definition on role_definition.oid = privilege.grantee
      where namespace.nspname in ('public', 'private')
        and role_definition.rolname in ('anon', 'authenticated', 'service_role')
      order by namespace.nspname, role_definition.rolname, privilege.privilege_type
    `,
    defaultPrivileges: `
      select
        namespace.nspname as schema,
        owner_role.rolname as owner,
        case default_acl.defaclobjtype
          when 'r' then 'table'
          when 'S' then 'sequence'
          when 'f' then 'function'
          when 'T' then 'type'
          when 'n' then 'schema'
          else default_acl.defaclobjtype::text
        end as object_type,
        coalesce(grantee_role.rolname, 'PUBLIC') as grantee,
        privilege.privilege_type
      from pg_default_acl as default_acl
      join pg_namespace as namespace on namespace.oid = default_acl.defaclnamespace
      join pg_roles as owner_role on owner_role.oid = default_acl.defaclrole
      cross join lateral aclexplode(default_acl.defaclacl) as privilege
      left join pg_roles as grantee_role on grantee_role.oid = privilege.grantee
      where namespace.nspname in ('public', 'private')
        and coalesce(grantee_role.rolname, 'PUBLIC') in (
          'anon', 'authenticated', 'service_role', 'PUBLIC'
        )
      order by namespace.nspname, owner_role.rolname, object_type,
        grantee, privilege.privilege_type
    `,
    functions: `
      select
        namespace.nspname as schema,
        procedure.proname as name,
        pg_get_function_identity_arguments(procedure.oid) as arguments,
        pg_get_function_result(procedure.oid) as result,
        procedure.prosecdef as security_definer,
        procedure.proconfig as configuration,
        pg_get_functiondef(procedure.oid) as definition
      from pg_proc as procedure
      join pg_namespace as namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname in ('public', 'private')
      order by namespace.nspname, procedure.proname,
        pg_get_function_identity_arguments(procedure.oid)
    `,
  };

  const inventory = {};
  for (const [name, query] of Object.entries(queries)) {
    inventory[name] = (await client.query(query)).rows;
  }
  return inventory;
}

export function withoutSupabasePlatformObjects(inventory) {
  return {
    ...inventory,
    functions: inventory.functions.filter(
      (entry) =>
        !(entry.schema === "public" && entry.name === "rls_auto_enable"),
    ),
  };
}

export async function writeSchemaInventory(path, inventory) {
  await writeFile(path, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
}

export function printSchemaInventorySummary(inventory) {
  console.table(
    Object.entries(inventory).map(([section, entries]) => ({
      Bereich: section,
      Anzahl: entries.length,
    })),
  );
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  const projectRoot = resolve(import.meta.dirname, "..");
  const envSource = await readFile(resolve(projectRoot, ".env"), "utf8").catch(
    () => "",
  );
  const readEnvValue = (key) => {
    const line = envSource
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));
    return line
      ? line
          .slice(line.indexOf("=") + 1)
          .trim()
          .replace(/^["']|["']$/g, "")
      : "";
  };
  const connectionString =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    readEnvValue("SUPABASE_URL");
  const poolerHost =
    process.env.SUPABASE_POOLER_HOST?.trim() ||
    readEnvValue("SUPABASE_POOLER_HOST");
  const outputPath = process.argv[2];
  if (!connectionString?.startsWith("postgres")) {
    throw new Error(
      "DATABASE_URL oder SUPABASE_URL muss eine PostgreSQL-Verbindungsadresse sein.",
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
    ssl:
      directUrl.hostname === "localhost" || directUrl.hostname === "127.0.0.1"
        ? false
        : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const inventory = withoutSupabasePlatformObjects(
      await collectSchemaInventory(client),
    );
    printSchemaInventorySummary(inventory);
    if (outputPath) await writeSchemaInventory(outputPath, inventory);
    else console.log(JSON.stringify(inventory, null, 2));
  } finally {
    await client.end().catch(() => undefined);
  }
}
