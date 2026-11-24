import test from 'node:test'; import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process'; import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { makeChallenge, missedDays, makeSchedule, isStudyDay, setPaused, achievements } from '../src/core/discipline.js';
import { parseJsonl, entriesToCsv, prepareImport } from '../src/core/importer.js';
test('challenge: validation and missed days (rest days excluded)', () => {
  assert.throws(() => makeChallenge({ days: 0, start: '2026-11-01' }, 'a')); assert.throws(() => makeChallenge({ days: 7, start: 'x' }, 'a'));
  const c = makeChallenge({ days: 7, start: '2026-11-20' }, 'a'); assert.equal(c.title, '7-day challenge');
  assert.equal(missedDays(c, ['2026-11-20'], '2026-11-23'), 2);            // 21,22 missed (today not counted)
  assert.equal(missedDays(c, ['2026-11-20'], '2026-11-23', ['2026-11-21']), 1);
  assert.equal(missedDays(c, [], '2027-01-01'), 7);                          // capped at challenge length
});
test('schedule: study days, pause/resume, validation', () => {
  const s = makeSchedule({ days: [3, 1, 1], hour: 8, minute: 0 }, 's'); assert.deepEqual(s.days, [1, 3]);
  assert.ok(isStudyDay(s, '2026-11-23')); assert.ok(!isStudyDay(s, '2026-11-22'));             // Mon yes, Sun no
  assert.ok(!isStudyDay(setPaused(s, true), '2026-11-23')); assert.ok(isStudyDay(setPaused(setPaused(s, true), false), '2026-11-23'));
  assert.throws(() => makeSchedule({ days: [7], hour: 8, minute: 0 }, 's')); assert.throws(() => makeSchedule({ days: [1], hour: 24, minute: 0 }, 's'));
});
test('achievements: thresholds', () => {
  const e = m => achievements(m).filter(a => a.earned).map(a => a.id);
  assert.deepEqual(e({ streak: 0, reviews: 0, mastered: 0 }), []); assert.deepEqual(e({ streak: 7, reviews: 100, mastered: 10 }), ['first', 'streak3', 'streak7', 'rev100', 'master10']);
});
test('importer: JSONL errors, CSV quoting/NULLs, dedupe', () => {
  const good = { id: 'a', type: 'idiom', en: 'say "hi", ok', def: 'd', ex: ['e'], level: 'B1', somali: null };
  const text = [JSON.stringify(good), '{bad', JSON.stringify({ ...good, id: 'b' }), ''].join('\n');
  assert.equal(parseJsonl(text).errors.length, 1);
  const r = prepareImport(text); assert.equal(r.ok.length, 1); assert.deepEqual(r.rejected.map(x => x.reason), ['invalid JSON', 'duplicate']);
  assert.equal(r.csv.trim(), '"a","idiom","say ""hi"", ok","d",,"[""e""]",,"B1",,,,,"unverified"');
  assert.equal(entriesToCsv([]), '');
});
test('importer CLI end to end', () => {
  const d = mkdtempSync(join(tmpdir(), 'fu-')), inp = join(d, 'in.jsonl');
  writeFileSync(inp, readFileSync(new URL('../src/data/seed.json', import.meta.url), 'utf8').length ? JSON.parse(readFileSync(new URL('../src/data/seed.json', import.meta.url))).map(e => JSON.stringify(e)).join('\n') : '');
  const out = execFileSync('node', [new URL('../tools/import.mjs', import.meta.url).pathname, inp, join(d, 'o')]).toString();
  assert.match(out, /accepted 6, rejected 0/); assert.equal(readFileSync(join(d, 'o/entries.csv'), 'utf8').trim().split('\n').length, 6);
});
