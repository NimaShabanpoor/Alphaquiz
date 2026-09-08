import assert from "node:assert/strict";
import test from "node:test";
import { redactError, redactedError } from "../src/lib/error-redaction";

test("Fehlerredaktion behält Diagnosecode, aber keine Kandidatenwerte", () => {
  const error = { code: "23505", message: "duplicate Anna anna@example.test", details: "row Anna anna@example.test",
    hint: "Anna", query: "anna@example.test", cause: { name: "Anna" }, stack: "Anna" };
  assert.deepEqual(redactError(error), { code: "23505", message: "Ein eindeutiger Datensatz ist bereits vorhanden." });
  const forwarded = redactedError(error);
  assert.equal(forwarded.code, "23505");
  assert.doesNotMatch(`${forwarded.stack} ${JSON.stringify(forwarded)}`, /Anna|anna@example/);
  assert.deepEqual(redactError(forwarded), redactError(error));
});

test("unbekannte und manipulierte Fehler werden ohne fremden Text redigiert", () => {
  for (const error of [new Error("anna@example.test"), "Anna", null, { code: "anna@example.test" }, { get code() { throw new Error("Getter executed"); } }]) {
    assert.deepEqual(redactError(error), { code: "UNKNOWN", message: "Ein Dienst- oder Verarbeitungsfehler ist aufgetreten." });
  }
});
