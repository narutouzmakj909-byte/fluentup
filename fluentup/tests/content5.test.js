import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson, validateConversation } from '../src/core/lessons.js'; import { importEntries } from '../src/core/library.js'; import { LEVELS } from '../src/core/exercises.js';
const J = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8')), A = (...f) => f.flatMap(J);
const lessonFiles = ['grammar', 'grammar2', 'grammar3', 'reading', 'reading2', 'reading3', 'reading4', 'professional', 'professional2', 'professional3', 'professional4'];
test('no two lessons, conversations, listening items, writing prompts or library entries share an id (duplicates silently overwrite content)', () => {
  const dup = (l, what) => { const ids = l.map(x => x.id), d = ids.filter((x, i) => ids.indexOf(x) !== i); assert.deepEqual(d, [], what + ' duplicate ids: ' + d); };
  dup(A(...lessonFiles), 'lessons'); dup(A('conversations', 'conversations2', 'conversations3', 'conversations4'), 'conversations'); dup(A('listening', 'listening2', 'listening3', 'listening4'), 'listening');
  dup(A('writing', 'writing2', 'writing3'), 'writing'); dup(A('seed', 'seed2', 'seed3', 'seed4', 'seed5'), 'entries');
});
test('batch 5: lessons and conversations validate, are unverified, and carry no invented Somali', () => {
  for (const l of A('reading4', 'professional4')) { assert.deepEqual(validateLesson(l), [], l.id); assert.equal(l.status, 'unverified'); assert.equal(l.somali, null); }
  for (const c of A('conversations4')) { assert.deepEqual(validateConversation(c), [], c.id); assert.equal(c.status, 'unverified'); }
  for (const l of A('listening4')) { assert.ok(l.sentences.length >= 4 && l.questions.length >= 3, l.id); for (const q of l.questions) if (q.type === 'mcq') assert.ok(q.options[q.answer], l.id); }
});
test('batch 5 fills the CEFR gaps it targets', () => {
  const lv = (files, l) => A(...files).some(x => x.level === l);
  assert.ok(lv(['conversations', 'conversations2', 'conversations3', 'conversations4'], 'A1')); assert.ok(lv(['conversations', 'conversations2', 'conversations3', 'conversations4'], 'C2'));
  for (const l of ['A2', 'C2']) assert.ok(lv(['professional', 'professional2', 'professional3', 'professional4'], l), 'professional ' + l);
  assert.ok(lv(['reading4'], 'A1')); assert.ok(lv(['listening4'], 'A1'));
});
test('seed5 entries import cleanly with the rest of the library (no rejects)', () => {
  const r = importEntries(A('seed', 'seed2', 'seed3', 'seed4', 'seed5')); assert.equal(r.rejected.length, 0, JSON.stringify(r.rejected.slice(0, 2)));
  for (const e of A('seed5')) { assert.equal(e.status, 'unverified'); assert.equal(e.somali, null); assert.ok(LEVELS.includes(e.level)); }
});
test('every conversation can be finished: every branch reaches an end node with a best path scoring maximum', () => {
  for (const c of A('conversations4')) { let best = 0; (function walk(k, s, seen) { const n = c.nodes[k]; if (n.end) { best = Math.max(best, s); return; } for (const ch of n.choices) if (!seen.has(ch.next)) walk(ch.next, s + ch.score, new Set([...seen, k])); })(c.start, 0, new Set()); assert.ok(best >= 4, c.id + ' best ' + best); }
});
