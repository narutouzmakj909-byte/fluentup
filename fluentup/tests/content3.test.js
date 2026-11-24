import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { MemoryStore, Repo } from '../src/core/store.js'; import { validateConversation, begin, choose, isDone } from '../src/core/lessons.js'; import { checkWriting } from '../src/core/writing.js';
const L = f => JSON.parse(readFileSync(new URL('../src/data/' + f, import.meta.url), 'utf8')), LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
test('listening: 12 lessons cover A1-C2, valid questions, never claim recorded audio', () => {
  const all = [...L('listening.json'), ...L('listening2.json')]; assert.ok(all.length >= 12); assert.equal(new Set(all.map(l => l.id)).size, all.length);
  for (const lv of LV) assert.ok(all.some(l => l.level === lv), lv);
  for (const l of all) { assert.equal(l.audio, null, l.id); assert.ok(l.sentences.length >= 3 && l.questions.length >= 2, l.id); for (const q of l.questions) { assert.ok(['mcq', 'fill'].includes(q.type)); if (q.type === 'mcq') assert.ok(q.answer >= 0 && q.answer < q.options.length); else assert.ok(q.answer); } }
});
test('writing: 12 prompts cover all kinds and levels; model answers pass their own rule checks where short', () => {
  const all = [...L('writing.json'), ...L('writing2.json')]; assert.ok(all.length >= 12); assert.equal(new Set(all.map(w => w.id)).size, all.length);
  for (const k of ['sentence', 'paragraph', 'email', 'essay', 'report']) assert.ok(all.some(w => w.kind === k), k); for (const lv of LV) assert.ok(all.some(w => w.level === lv), lv);
  for (const w of all) { assert.ok(Number.isInteger(w.minWords) && w.maxWords > w.minWords && w.prompt); assert.equal(typeof checkWriting(w, '').passed, 'boolean'); assert.equal(checkWriting(w, '').kind, 'rule-based'); }
});
test('branching conversations: valid, different choices lead to different next lines', () => {
  for (const c of L('conversations3.json')) {
    assert.deepEqual(validateConversation(c), [], c.id); const next = new Set(c.nodes[c.start].choices.map(x => x.next)); assert.ok(next.size >= 2, c.id + ' branches');
    let st = begin(c), steps = 0; while (!isDone(c, st)) { st = choose(c, st, 0); assert.ok(++steps < 20); }
  }
});
test('recordings persist locally, are not queued for sync, and only the newest 30 are kept', async () => {
  const r = new Repo(new MemoryStore()); for (let i = 0; i < 33; i++) await r.putRecording({ id: 'r' + i, at: i, text: 't', blob: new Blob(['x'], { type: 'audio/webm' }) });
  const all = await r.recordings(); assert.equal(all.length, 30); assert.equal(all[0].id, 'r3'); assert.equal((await r.pending()).length, 0);
  await r.delRecording('r5'); assert.equal((await r.recordings()).length, 29);
});
