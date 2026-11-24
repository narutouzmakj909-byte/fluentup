import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateConversation, begin, choose, isDone, percent } from '../src/core/lessons.js';
const load = f => JSON.parse(readFileSync(new URL('../src/data/' + f, import.meta.url), 'utf8'));
const all = [...load('conversations.json'), ...load('conversations2.json')];
test('all conversations are valid, unique and cover A2-C1', () => {
  assert.ok(all.length >= 16);
  assert.equal(new Set(all.map(c => c.id)).size, all.length);
  for (const c of all) assert.deepEqual(validateConversation(c), [], c.id);
  const lv = new Set(all.map(c => c.level)); for (const l of ['A2', 'B1', 'B2', 'C1']) assert.ok(lv.has(l), l);
});
test('best path scores 100%, worst path scores lower', () => {
  for (const c of load('conversations2.json')) {
    for (const [pick, want] of [[ch => ch.reduce((b, x, i) => x.score > ch[b].score ? i : b, 0), 100], [ch => ch.reduce((b, x, i) => x.score < ch[b].score ? i : b, 0), 0]]) {
      let st = begin(c); while (!isDone(c, st)) st = choose(c, st, pick(c.nodes[st.node].choices));
      want === 100 ? assert.equal(percent(st), 100, c.id) : assert.ok(percent(st) < 60, c.id);
    }
  }
});
