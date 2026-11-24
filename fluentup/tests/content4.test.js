import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson } from '../src/core/lessons.js'; import { LEVELS } from '../src/core/exercises.js';
const J = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
test('reading3 + professional3 lessons validate, unique ids vs all earlier lessons, unverified, no fabricated Somali', () => {
  const prior = ['grammar', 'grammar2', 'grammar3', 'reading', 'reading2', 'professional', 'professional2'].flatMap(J), mine = [...J('reading3'), ...J('professional3')];
  for (const l of mine) { assert.deepEqual(validateLesson(l), [], l.id); assert.equal(l.status, 'unverified'); assert.equal(l.somali, null); }
  assert.equal(new Set([...prior, ...mine].map(l => l.id)).size, prior.length + mine.length);
  for (const l of ['A2', 'B1', 'B2', 'C1', 'C2']) assert.ok(J('reading3').some(x => x.level === l), 'reading ' + l);
});
test('listening3 + writing3 are well-formed and every answer key points at a real option', () => {
  const prior = ['listening', 'listening2'].flatMap(J), mine = J('listening3');
  assert.equal(new Set([...prior, ...mine].map(l => l.id)).size, prior.length + mine.length);
  for (const l of mine) { assert.ok(LEVELS.includes(l.level) && l.sentences.length >= 4 && l.questions.length >= 3, l.id);
    for (const q of l.questions) if (q.type === 'mcq') assert.ok(Number.isInteger(q.answer) && q.options[q.answer], l.id + ' ' + q.prompt); else assert.ok(String(q.answer).length, l.id); }
  const w = [...J('writing'), ...J('writing2')], w3 = J('writing3'); assert.equal(new Set([...w, ...w3].map(x => x.id)).size, w.length + w3.length);
  for (const x of w3) assert.ok(LEVELS.includes(x.level) && Number.isInteger(x.minWords) && x.prompt, x.id);
});
