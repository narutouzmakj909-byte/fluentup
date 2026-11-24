import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { browse, toggle } from '../src/core/library.js'; import { monthGrid } from '../src/core/calendar.js';
const seed = JSON.parse(readFileSync(new URL('../src/data/seed.json', import.meta.url)));
test('browse: type/level/saved filters and pagination clamp', () => {
  assert.equal(browse(seed, { type: 'idiom' }).total, 2); assert.equal(browse(seed, { level: 'B2' }).total, 2);
  assert.equal(browse(seed, { type: 'idiom', level: 'B2' }).total, 0); assert.deepEqual(browse(seed, { only: new Set(['w1']) }).items.map(e => e.id), ['w1']);
  const r = browse(seed, { pageSize: 4, page: 99 }); assert.equal(r.page, 2); assert.equal(r.items.length, 2); assert.equal(browse([], {}).pages, 1);
});
test('toggle: add then remove, no mutation', () => { const a = ['x']; assert.deepEqual(toggle(a, 'y'), ['x', 'y']); assert.deepEqual(toggle(a, 'x'), []); assert.deepEqual(a, ['x']); });
test('calendar: Nov 2026 grid states', () => {
  const w = monthGrid(2026, 10, { done: ['2026-11-20'], rest: ['2026-11-21'], today: '2026-11-22', since: '2026-11-18' }), cells = w.flat().filter(Boolean), st = d => cells.find(c => c.date === d).state;
  assert.equal(w.length, 5); assert.equal(w[0][0].date, '2026-11-01'); assert.equal(cells.length, 30); assert.equal(w[4][2], null);
  assert.deepEqual(['2026-11-17', '2026-11-18', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'].map(st), ['none', 'missed', 'done', 'rest', 'today', 'future']);
  assert.equal(monthGrid(2026, 11, { today: '2026-11-22' })[0].findIndex(Boolean), 2); // Dec 1 2026 is Tuesday
});
