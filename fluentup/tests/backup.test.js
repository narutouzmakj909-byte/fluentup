import test from 'node:test'; import assert from 'node:assert/strict';
import { buildBackup, parseBackup, pickCard, mergeMetaValue, validCard, FORMAT } from '../src/core/backup.js'; import { newCard, review } from '../src/core/srs.js';
const T = 1.7e12, card = (id, grades = []) => grades.reduce((c, g) => review(c, g, c.due), newCard(id, T));
test('round trip: a backup parses back to identical cards and meta', () => {
  const cards = [card('a', [4, 5]), card('b')], b = buildBackup({ cards, meta: { days: ['2026-01-01'], goal: { vocab: 9 }, junk: 1 }, alarms: [{ id: 'x' }] }, T), r = parseBackup(JSON.stringify(b));
  assert.ok(r.ok); assert.deepEqual(r.data.cards, cards); assert.deepEqual(r.data.meta, { days: ['2026-01-01'], goal: { vocab: 9 } }); assert.equal(r.skipped, 0); assert.equal(b.format, FORMAT);
});
test('rejects empty, non-JSON, wrong app, wrong format, oversized and structurally broken files without throwing', () => {
  for (const t of ['', '   ', 'not json', '[]', '{"app":"other"}', JSON.stringify({ app: 'fluentup', format: 99, cards: [], meta: {} }), JSON.stringify({ app: 'fluentup', format: 1 }), 'x'.repeat(8_000_001), null, 42]) assert.equal(parseBackup(t).ok, false, String(t).slice(0, 20));
});
test('corrupt or hostile cards are dropped and counted, valid ones kept; unknown meta keys and bad values ignored', () => {
  const good = card('ok', [4]), evil = [{ id: 'x', ease: 'NaN' }, { ...good, id: 'y', ease: 99 }, { ...good, id: 'z', history: [{ at: 1, grade: 9 }] }, { ...good, id: 'w', state: 'hacked' }, null, 'str'];
  const r = parseBackup(JSON.stringify({ app: 'fluentup', format: 1, cards: [good, ...evil], meta: { theme: 'neon', tsize: 'xl', __proto__: { polluted: 1 }, evil: 1, days: 'no', recent: ['a', 5] } }));
  assert.ok(r.ok); assert.equal(r.data.cards.length, 1); assert.equal(r.skipped, 6); assert.deepEqual(r.data.meta, { tsize: 'xl', recent: ['a'] }); assert.equal({}.polluted, undefined);
  assert.ok(validCard(good));
});
test('restore never loses local progress: newer/longer history wins, sets are unioned, best scores kept, prefs not overwritten', () => {
  const local = card('a', [4, 4, 4]), old = card('a', [4]); assert.equal(pickCard(local, old), local); assert.equal(pickCard(old, local), local); assert.equal(pickCard(undefined, old), old);
  assert.deepEqual(mergeMetaValue('days', ['d1', 'd2'], ['d2', 'd3']).sort(), ['d1', 'd2', 'd3']);
  assert.deepEqual(mergeMetaValue('lessonProg', { a: 80, b: 50 }, { a: 60, b: 90, c: 10 }), { a: 80, b: 90, c: 10 });
  assert.deepEqual(mergeMetaValue('writeLog', [{ x: 1 }], [{ x: 1 }, { x: 2 }]), [{ x: 1 }, { x: 2 }]);
  assert.deepEqual(mergeMetaValue('goal', { vocab: 5 }, { vocab: 50 }), { vocab: 5 }); assert.deepEqual(mergeMetaValue('goal', {}, { vocab: 50 }), { vocab: 50 }); assert.equal(mergeMetaValue('theme', 'dark', 'light'), 'dark');
});
import { backupDue } from '../src/core/backup.js';
test('backup reminder: only with progress, and only when the last backup is missing or older than 14 days', () => {
  const now = 2e12, D = 86400000;
  assert.equal(backupDue({ reviews: 0, lastBackup: 0, now }), false); assert.equal(backupDue({ reviews: 5, lastBackup: 0, now }), true);
  assert.equal(backupDue({ reviews: 5, lastBackup: now - 3 * D, now }), false); assert.equal(backupDue({ reviews: 5, lastBackup: now - 15 * D, now }), true);
});
