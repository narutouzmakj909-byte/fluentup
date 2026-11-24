import test from 'node:test'; import assert from 'node:assert/strict';
import { checkWriting } from '../src/core/writing.js';
import { gradeCorrection } from '../src/core/exercises.js';
import { makeChallenge, pauseChallenge, resumeChallenge, pausedDays, missedDays } from '../src/core/discipline.js';
test('writing: clean text passes; flags are specific and labelled rule-based', () => {
  assert.ok(checkWriting('I like tea.', { minWords: 3 }).passed);
  const r = checkWriting('i like like tea', { minWords: 10 }); const c = r.issues.map(i => i.code);
  for (const k of ['too_short', 'capital', 'end_punct', 'lower_i', 'repeat']) assert.ok(c.includes(k), k);
  assert.equal(r.kind, 'rule-based');
  assert.ok(checkWriting("Hi, I can't come.", { formal: true }).issues.some(i => i.code === 'register'));
  assert.ok(checkWriting('Hello there.', { required: ['visit'] }).issues.some(i => i.code === 'missing_word'));
});
test('correction grading accepts alternatives', () => {
  const q = { answer: 'She goes home.', accept: ['She goes to home.'] };
  assert.ok(gradeCorrection(q, 'she goes home')); assert.ok(!gradeCorrection(q, 'She go home.'));
});
test('challenge pause/resume excludes paused days from missed count', () => {
  const ch = makeChallenge({ days: 7, start: '2026-01-01' }, 'c');
  const p = pauseChallenge(ch, '2026-01-03'), r = resumeChallenge(p, '2026-01-05');
  assert.deepEqual(pausedDays(r, '2026-01-08'), ['2026-01-03', '2026-01-04']);
  assert.equal(missedDays(ch, [], '2026-01-05'), 4);
  assert.equal(missedDays(ch, [], '2026-01-05', pausedDays(r, '2026-01-05')), 2);
  assert.equal(resumeChallenge(ch, '2026-01-02'), ch);
});
