import assert from "node:assert/strict";

export const snapshotMigration = "20260907000000_remove_snapshot_identity.sql";
const owner = "11111111-1111-4111-8111-111111111111";
const id = "__snapshot_migration_probe";
const content = {
  questionOrder: ["second", "first"], topicOrder: ["topic"],
  questions: [{ id: "second", points: 3, answers: [{ id: "a", correct: true }] }],
  answerOrderByQuestionId: { second: ["b", "a"] }, seed: "stable",
};

// Called only by verify-migrations, which refuses non-local databases.
export async function seedLegacySnapshot(client) {
  await client.query("insert into auth.users(id) values ($1)", [owner]);
  await client.query('insert into public.quizzes(id,title,user_id) values ($1,$1,$2)', [id, owner]);
  await client.query('insert into public.exam_publications(id,"quizId",slug) values ($1,$1,$1)', [id]);
  await client.query('insert into public.exam_attempts(id,"publicationId",name,email) values ($1,$1,$2,$3)', [id, "Synthetic Candidate", "synthetic@example.test"]);
  await client.query(`insert into public.exam_instances
    (id,"attemptId","publicationId","quizId","studentKey","questionOrder","topicOrder","answerOrderByQuestionId",snapshot,seed)
    values ($1,$1,$1,$1,$2,$3,$4,$5,$6,'stable')`, [id, "synthetic@example.test",
    JSON.stringify(content.questionOrder), JSON.stringify(content.topicOrder),
    JSON.stringify(content.answerOrderByQuestionId),
    JSON.stringify({ ...content, studentKey: "synthetic@example.test", name: "Synthetic Candidate", email: "synthetic@example.test" })]);
}

export async function verifyLegacySnapshotCleanup(client) {
  const { rows } = await client.query('select snapshot from public.exam_instances where id=$1', [id]);
  assert.deepEqual(rows[0]?.snapshot, content, "Migration must remove identities and preserve all exam content");
  const column = await client.query("select 1 from information_schema.columns where table_schema='public' and table_name='exam_instances' and column_name='studentKey'");
  assert.equal(column.rowCount, 0);
  for (const key of ["studentKey", "name", "email"]) {
    await client.query("begin");
    try {
      await assert.rejects(client.query('update public.exam_instances set snapshot=snapshot || $1::jsonb where id=$2', [JSON.stringify({ [key]: "identity" }), id]), { code: "23514" });
    } finally {
      await client.query("rollback");
    }
  }
  await client.query('delete from public.quizzes where id=$1', [id]);
  await client.query('delete from auth.users where id=$1', [owner]);
  console.log("Snapshot migration probe: old identities removed; content unchanged; identity reintroduction rejected.");
}
