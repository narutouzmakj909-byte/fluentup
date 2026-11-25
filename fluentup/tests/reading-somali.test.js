import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const J = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
test('all 20 reading passages have Somali title, passage, and aligned glossary translations', () => {
  const lessons = ['reading', 'reading2', 'reading3', 'reading4'].flatMap(f => J(f));
  assert.equal(lessons.length, 20);
  for (const l of lessons) {
    assert.ok(l.titleSo?.length > 2, `${l.id}: titleSo`);
    assert.ok(l.somali?.length > 80, `${l.id}: Somali passage`);
    assert.equal(l.examplesSo?.length, l.examples.length, `${l.id}: glossary alignment`);
    assert.ok(l.examplesSo.every(x => typeof x === 'string' && x.length > 3), `${l.id}: glossary values`);
  }
});
