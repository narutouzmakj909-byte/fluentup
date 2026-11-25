import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load = f => JSON.parse(readFileSync(new URL('../src/data/' + f, import.meta.url), 'utf8'));
const all = [...load('conversations.json'), ...load('conversations2.json'), ...load('conversations3.json'), ...load('conversations4.json')];
const batch = new Set(['c-airport', 'c-hotel', 'c-directions', 'c-phone']);
test('Conversation Somali batch 3 localizes titles, contexts, dialogue, choices and feedback', () => {
  const selected = all.filter(c => batch.has(c.id));
  assert.equal(selected.length, batch.size);
  for (const c of selected) {
    assert.ok(c.titleSo?.length > 2, `${c.id}: titleSo`);
    assert.ok(c.contextSo?.length > 10, `${c.id}: contextSo`);
    for (const [id, n] of Object.entries(c.nodes)) {
      assert.ok(n.saySo?.length > 3, `${c.id}/${id}: saySo`);
      for (const [i, ch] of (n.choices ?? []).entries()) {
        assert.ok(ch.textSo?.length > 1, `${c.id}/${id}/${i}: textSo`);
        assert.ok(ch.feedbackSo?.length > 3, `${c.id}/${id}/${i}: feedbackSo`);
      }
    }
  }
});
