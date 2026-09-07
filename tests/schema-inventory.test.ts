import assert from "node:assert/strict";
import test from "node:test";

test("Schema-Inventar normalisiert Funktionsdefinitionen auf LF", async () => {
  const { withoutSupabasePlatformObjects } = await import(
    "../scripts/schema-inventory.mjs"
  );
  const inventory = withoutSupabasePlatformObjects({
    tables: [],
    functions: [
      {
        schema: "public",
        name: "example",
        definition: "erste Zeile\r\nzweite Zeile\rdritte Zeile\n",
      },
    ],
  });

  assert.equal(
    inventory.functions[0].definition,
    "erste Zeile\nzweite Zeile\ndritte Zeile\n",
  );
});
