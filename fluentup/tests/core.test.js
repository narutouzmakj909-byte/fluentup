import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newCard, review, dueCards, stats, DAY } from '../src/core/srs.js';
import { gradeAnswer, scoreSession, nextLevel } from '../src/core/exercises.js';
import { streak, challengeProgress, nextAlarm, snooze, addDays } from '../src/core/schedule.js';
import { Outbox, resolve } from '../src/core/sync.js';
import { importEntries, buildIndex, search } from '../src/core/library.js';
const seed = JSON.parse(readFileSync(new URL('../src/data/seed.json', import.meta.url)));
const T = 1_700_000_000_000;
test('srs: intervals 1,3,then ease-scaled', () => {
  let c = newCard('a', T); c = review(c, 5, T); assert.equal(c.interval, 1);
  c = review(c, 5, c.due); assert.equal(c.interval, 3); const at = c.due; c = review(c, 4, at); assert.ok(c.interval >= 7);
  assert.equal(c.due, at + c.interval * DAY);
});
test('srs: lapses, difficult, ease floor, bad grade', () => {
  let c = newCard('a', T); for (let i = 0; i < 4; i++) c = review(c, 0, T);
  assert.equal(c.state, 'difficult'); assert.equal(c.reps, 0); assert.ok(c.ease >= 1.3);
  assert.throws(() => review(c, 6));
});
test('srs: due + stats', () => {
  const a = review(newCard('a', T), 5, T), b = newCard('b', T);
  assert.deepEqual(dueCards([a, b], T).map(c => c.id), ['b']); assert.equal(stats([a, b], T).due, 1);
});
test('exercises: grading & scoring', () => {
  assert.ok(gradeAnswer({ type: 'fill', answer: 'resilient' }, ' Resilient. '));
  assert.ok(gradeAnswer({ type: 'order', answer: ['I', 'am', 'here'] }, ['i', 'am', 'here']));
  assert.ok(!gradeAnswer({ type: 'mcq', answer: 1 }, 2));
  assert.ok(gradeAnswer({ type: 'match', pairs: [['a', '1'], ['b', '2']] }, { a: '1', b: '2' }));
  const s = scoreSession([{ id: 1, correct: true }, { id: 2, correct: false }]);
  assert.equal(s.accuracy, 0.5); assert.deepEqual(s.reviewList, [2]);
});
test('exercises: deterministic difficulty', () => {
  assert.equal(nextLevel('B1', [1, 1, 1, 1, 1]), 'B2'); assert.equal(nextLevel('B1', [0, 0, 0, 1, 0]), 'A2');
  assert.equal(nextLevel('A1', [0, 0, 0, 0, 0]), 'A1'); assert.equal(nextLevel('B1', [1, 1]), 'B1');
});
test('schedule: streak with rest days and grace', () => {
  assert.equal(streak(['2026-11-20', '2026-11-21', '2026-11-22'], '2026-11-22'), 3);
  assert.equal(streak(['2026-11-20', '2026-11-22'], '2026-11-22', ['2026-11-21']), 2);
  assert.equal(streak(['2026-11-20', '2026-11-21'], '2026-11-22'), 2);
  assert.equal(streak(['2026-11-19'], '2026-11-22'), 0);
});
test('schedule: challenge progress', () => {
  const p = challengeProgress({ start: '2026-11-20', days: 7 }, ['2026-11-20', '2026-11-22', '2026-10-01'], '2026-11-22');
  assert.equal(p.completed, 2); assert.equal(p.percent, 29); assert.equal(p.elapsed, 3); assert.equal(p.end, addDays('2026-11-20', 6));
});
test('alarms: next fire, repeat days, disabled, snooze', () => {
  const now = new Date(2026, 10, 22, 10, 0);
  assert.equal(nextAlarm({ hour: 9, minute: 0, days: [], enabled: true }, now).getDate(), 23);
  assert.equal(nextAlarm({ hour: 11, minute: 0, days: [3], enabled: true }, now).getDay(), 3);
  assert.equal(nextAlarm({ hour: 11, minute: 0, enabled: false }, now), null);
  assert.equal(snooze(now, 10).getMinutes(), 10);
});
test('sync: dedupe, backoff, conflict, LWW', async () => {
  const o = new Outbox(); assert.ok(o.enqueue({ id: 'x' })); assert.ok(!o.enqueue({ id: 'x' }));
  let r = await o.flush(async () => { throw new Error('offline'); }, T); assert.equal(r.failed, 1); assert.equal(o.q.length, 1);
  r = await o.flush(async () => {}, T); assert.equal(r.sent, 0);
  r = await o.flush(async () => ({ conflict: true, server: {} }), T + 10000); assert.equal(r.conflicts.length, 1); assert.equal(o.q.length, 0);
  assert.equal(resolve({ updatedAt: 2, v: 'l' }, { updatedAt: 1, v: 's' }).v, 'l');
});
test('library: validate, dedupe, index, search', () => {
  const { ok, rejected } = importEntries([...seed, { ...seed[0], id: 'dup' }, { id: 'bad' }]);
  assert.equal(ok.length, 6); assert.equal(rejected.length, 2);
  const idx = buildIndex(ok), by = new Map(ok.map(e => [e.id, e]));
  assert.deepEqual(search(idx, by, 'look for').map(e => e.id), ['p1']); assert.equal(search(idx, by, 'resil')[0].id, 'w1');
});
