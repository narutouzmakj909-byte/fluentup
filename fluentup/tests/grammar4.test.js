import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson } from '../src/core/lessons.js';
const L = JSON.parse(readFileSync(new URL('../src/data/grammar4.json', import.meta.url), 'utf8'));
const NAMES = ['Present Simple','Present Continuous','Present Perfect','Present Perfect Continuous','Past Simple','Past Continuous','Past Perfect','Past Perfect Continuous','Future Simple','Future Continuous','Future Perfect','Future Perfect Continuous'];
test('all 12 tenses exist, each with the full required structure', () => {
  assert.deepEqual(L.map(x => x.title), NAMES);
  for (const l of L) {
    assert.deepEqual(validateLesson(l), [], l.id);
    assert.ok(l.somali.length > 40 && l.formula && l.explanation, l.id);
    for (const k of ['affirmative', 'negative', 'question', 'wh']) { assert.ok(l.forms[k].length >= 2, l.id + k); for (const [en, so] of l.forms[k]) assert.ok(en && so, l.id + k); }
    assert.equal(l.mistakes.length, l.mistakesSo.length, l.id);
    assert.ok(l.exercises.length >= 5 && l.exercises.every(x => x.explain && x.explainSo), l.id);
    assert.ok(['mcq', 'fill', 'correct', 'order'].every(t => l.exercises.some(x => x.type === t)), l.id);
    assert.equal(l.status, 'somali-draft');
  }
});
test('app loads grammar4 and the service worker caches it', () => {
  assert.match(readFileSync(new URL('../src/app.js', import.meta.url), 'utf8'), /\.\.\.await load\('grammar4'\)/);
  assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /grammar4\.json/);
});
