import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { importEntries } from '../src/core/library.js';
const J = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
test('seed4: valid, no duplicates, unverified, no fabricated Somali, all CEFR levels', () => {
  const s4 = J('seed4'), r = importEntries([...J('seed'), ...J('seed2'), ...J('seed3'), ...s4]);
  assert.equal(r.rejected.length, 0, JSON.stringify(r.rejected)); assert.ok(s4.length >= 40);
  for (const e of s4) { assert.equal(e.status, 'unverified'); assert.equal(e.somali, null); }
  for (const l of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) assert.ok(s4.some(e => e.level === l), l);
});
