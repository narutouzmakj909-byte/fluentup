import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson } from '../src/core/lessons.js'; import { importEntries } from '../src/core/library.js';
const L = f => JSON.parse(readFileSync(new URL('../src/data/' + f, import.meta.url), 'utf8'));
test('reading and professional lessons are valid, unique, cover levels, and stay honest about status', () => {
  const rd = [...L('reading.json'), ...L('reading2.json')], pr = [...L('professional.json'), ...L('professional2.json')], all = [...rd, ...pr];
  for (const l of all) assert.deepEqual(validateLesson(l), [], l.id); assert.equal(new Set(all.map(l => l.id)).size, all.length);
  for (const lv of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) assert.ok(rd.some(l => l.level === lv), 'reading ' + lv);
  assert.ok(rd.length >= 13 && pr.length >= 8); for (const l of all) assert.notEqual(l.status, 'verified');
  for (const l of L('reading2.json')) assert.ok(l.examples.every(g => g.includes(':')), 'glossary format ' + l.id);
});
test('entries: seed3 has unique IDs and retains the supplied Somali vocabulary glosses', () => {
  const prior = [...L('seed.json'), ...L('seed2.json')], s3 = L('seed3.json'), { ok, rejected } = importEntries([...prior, ...s3]);
  assert.equal(rejected.length, 0); assert.equal(ok.length, prior.length + s3.length); assert.ok(s3.length >= 40);
  assert.ok(s3.every(e => typeof e.somali === 'string' && e.somali.trim() && e.status === 'unverified'));
});
