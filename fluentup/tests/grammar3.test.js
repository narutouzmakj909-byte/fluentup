import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson } from '../src/core/lessons.js'; import { gradeAnswer } from '../src/core/exercises.js';
const J = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
test('grammar3: 11 valid lessons, unique ids across all grammar, every exercise answerable, wrong mcq rejected', () => {
  const g3 = J('grammar3'), all = [...J('grammar'), ...J('grammar2'), ...g3];
  assert.equal(g3.length, 11); assert.equal(new Set(all.map(l => l.id)).size, all.length); assert.equal(all.length, 25);
  for (const l of g3) { assert.deepEqual(validateLesson(l), [], l.id); assert.ok(typeof l.somali === 'string' && l.somali.trim(), l.id);
    for (const q of l.exercises) { assert.ok(gradeAnswer(q, q.answer), l.id + ': ' + q.prompt); if (q.type === 'mcq') assert.ok(!gradeAnswer(q, (q.answer + 1) % q.options.length)); } }
});
test('service worker caches every data file and sw lists grammar3', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8'); assert.match(sw, /grammar3\.json/);
});
