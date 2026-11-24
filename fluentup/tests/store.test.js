import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MemoryStore, Repo } from '../src/core/store.js';
import { newCard, review } from '../src/core/srs.js';
import { buildQuiz } from '../src/core/quiz.js';
import { gradeAnswer, scoreSession } from '../src/core/exercises.js';
const seed = JSON.parse(readFileSync(new URL('../src/data/seed.json', import.meta.url)));
test('repo: save queues outbox op; failed sync keeps it; success clears it', async () => {
  const repo = new Repo(new MemoryStore()); await repo.saveCard(review(newCard('w1'), 4));
  assert.equal((await repo.pending()).length, 1);
  const r1 = await repo.sync(async () => { throw new Error('offline'); }, 1e15); assert.equal(r1.failed, 1);
  assert.equal((await repo.pending()).length, 1); assert.equal((await repo.pending())[0].attempts, 1);
  const r2 = await repo.sync(async () => {}, 2e15); assert.equal(r2.sent, 1); assert.equal((await repo.pending()).length, 0);
  assert.equal((await repo.cards()).length, 1);
});
test('repo: server-newer conflict replaces local card', async () => {
  const repo = new Repo(new MemoryStore()); await repo.saveCard(newCard('w1'));
  await repo.sync(async op => ({ conflict: true, server: { ...op.payload, updatedAt: op.payload.updatedAt + 1000, reps: 9 } }));
  assert.equal((await repo.cards())[0].reps, 9);
});
test('repo: meta + alarms persist', async () => {
  const repo = new Repo(new MemoryStore()); assert.deepEqual(await repo.meta('days', []), []);
  await repo.setMeta('days', ['2026-11-22']); assert.deepEqual(await repo.meta('days', []), ['2026-11-22']);
  await repo.putAlarm({ id: 'a', hour: 8 }); assert.equal((await repo.alarms()).length, 1);
  await repo.delAlarm('a'); assert.equal((await repo.alarms()).length, 0);
});
test('quiz: deterministic by seed; correct answers grade true; wrong grade false', () => {
  const a = buildQuiz(seed, { count: 6, seed: 7 }), b = buildQuiz(seed, { count: 6, seed: 7 });
  assert.deepEqual(a, b); assert.equal(a.length, 6);
  for (const q of a) assert.ok(gradeAnswer(q, q.type === 'mcq' ? q.answer : q.answer));
  const mcq = a.find(q => q.type === 'mcq'); assert.ok(!gradeAnswer(mcq, (mcq.answer + 1) % 4));
  assert.equal(scoreSession(a.map(q => ({ id: q.id, correct: true }))).accuracy, 1);
  assert.equal(new Set(a.filter(q => q.type === 'mcq').flatMap(q => q.options)).size >= 4, true);
});
