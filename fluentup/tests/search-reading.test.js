import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { unifiedSearch, pushRecent } from '../src/core/search.js'; import { validateLesson } from '../src/core/lessons.js'; import { gradeAnswer } from '../src/core/exercises.js';
const J = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8')), seed = J('seed'), grammar = J('grammar'), reading = J('reading'), prof = J('professional'), convos = J('conversations');
test('reading + professional content valid, tracks set, answers grade correct, glossary terms occur in passage', () => {
  const all = [...grammar, ...reading, ...prof]; assert.equal(new Set(all.map(l => l.id)).size, all.length);
  for (const l of all) { assert.deepEqual(validateLesson(l), [], l.id); for (const q of l.exercises) assert.ok(gradeAnswer(q, q.answer), q.prompt); }
  assert.ok(reading.every(l => l.track === 'reading') && prof.every(l => l.track === 'professional'));
  for (const r of reading) for (const g of r.examples) assert.match(r.explanation, new RegExp(`\\b${g.split(':')[0]}\\b`, 'i'), g);
  assert.ok(validateLesson({ ...reading[0], track: 'bogus' }).includes('track'));
});
test('unified search across entries, lessons, conversations; recent list', () => {
  const src = { entries: seed, lessons: [...grammar, ...reading, ...prof], convos };
  assert.deepEqual(unifiedSearch('break ice', src).map(r => r.kind + ':' + r.id), ['entry:i1']);
  assert.ok(unifiedSearch('perfect', src).some(r => r.id === 'g-perfect')); assert.ok(unifiedSearch('café', src).some(r => r.kind === 'convo'));
  assert.ok(unifiedSearch('email', src).some(r => r.id === 'p-email')); assert.deepEqual(unifiedSearch('   ', src), []); assert.deepEqual(unifiedSearch('zzzz', src), []);
  assert.deepEqual(pushRecent(['a', 'b'], 'b'), ['b', 'a']); assert.deepEqual(pushRecent(['a'], '  '), ['a']); assert.equal(pushRecent(['1', '2', '3', '4', '5'], 'x').length, 5);
});
test('UI: reading highlights vocabulary, professional lists, unified search opens results and keeps recents', async () => {
  const el = () => ({ innerHTML: '', dataset: {}, setAttribute() {}, focus() {}, setSelectionRange() {}, value: '' }), app = el(), nav = el();
  globalThis.document = { getElementById: id => id === 'app' ? app : el(), querySelector: () => nav, querySelectorAll: () => [], documentElement: { dataset: {} } };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true }); globalThis.addEventListener = () => {};
  const route = u => /grammar/.test(u) ? 'grammar' : /conversations/.test(u) ? 'conversations' : /reading/.test(u) ? 'reading' : /professional/.test(u) ? 'professional' : 'seed';
  globalThis.fetch = async u => ({ json: async () => J(route(u)) }); await import('../src/app.js');
  const go = t => nav.onclick({ target: { dataset: { t } } }), click = (d, id = '') => app.onclick({ target: { dataset: d, id } });
  go('library'); await click({ lm: 'reading' }); assert.match(app.innerHTML, /A day at the market/); assert.doesNotMatch(app.innerHTML, /The verb to be/);
  await click({ ls: 'r-market' }); assert.match(app.innerHTML, /<mark>stall<\/mark>/); assert.match(app.innerHTML, /<mark>bargain<\/mark>/); assert.match(app.innerHTML, /Glossary/);
  await click({ lback: '1' }); await click({ lm: 'professional' }); assert.match(app.innerHTML, /Writing a polite email/); assert.match(app.innerHTML, /Taking part in meetings/);
  await click({ lm: 'search' }); assert.match(app.innerHTML, /Type to search/); app.oninput({ target: { id: 'gq', value: 'meeting', selectionStart: 7 } });
  assert.match(app.innerHTML, /Taking part in meetings/); await click({ sr: 'lesson:p-meeting' }); assert.match(app.innerHTML, /Practice \(3\)/);
  await click({ lback: '1' }); await click({ lm: 'search' }); app.oninput({ target: { id: 'gq', value: '', selectionStart: 0 } }); assert.match(app.innerHTML, /data-rq="meeting"/);
  app.oninput({ target: { id: 'gq', value: 'caf', selectionStart: 3 } }); await click({ sr: 'convo:c-cafe' }); assert.match(app.innerHTML, /What can I get you/);
});
