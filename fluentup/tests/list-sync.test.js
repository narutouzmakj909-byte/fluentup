import test from 'node:test'; import assert from 'node:assert/strict';
import { Repo, MemoryStore, unionById } from '../src/core/store.js';
const rows = async repo => (await repo.s.all('outbox')).filter(o => o.kind === 'meta').map(o => ({ key: o.payload.key, value: o.payload.value, updated_at: new Date(o.payload.updatedAt ?? Date.now()).toISOString() }));
const mk = () => new Repo(new MemoryStore()), al = (id, label, updatedAt = 1) => ({ id, label, hour: 7, minute: 0, days: [1], enabled: true, updatedAt });
const latest = rs => { const m = new Map(); for (const r of rs) m.set(r.key, r); return [...m.values()]; };
test('unionById keeps both sides and prefers the newer copy of the same id', () => {
  assert.deepEqual(unionById([al('a', 'old', 1)], [al('a', 'new', 2), al('b', 'x')]).map(o => o.label), ['new', 'x']); assert.deepEqual(unionById(undefined, undefined), []);
});
test('two devices that each add an alarm offline keep BOTH after syncing', async () => {
  const A = mk(), B = mk(); await A.putAlarm(al('a1', 'from A')); await B.putAlarm(al('b1', 'from B'));
  const changedA = await A.mergeRemote(latest(await rows(B))); assert.ok(changedA.includes('syncAlarms'));
  assert.deepEqual((await A.meta('syncAlarms', [])).map(o => o.id).sort(), ['a1', 'b1']);
  await B.mergeRemote(latest(await rows(A))); assert.deepEqual((await B.meta('syncAlarms', [])).map(o => o.id).sort(), ['a1', 'b1']);
});
test('a delete on one device is not undone by the other device\'s older copy', async () => {
  const A = mk(), B = mk(); await A.putChallenge({ id: 'c1', title: 't', start: '2026-01-01', days: 7 }); await B.mergeRemote(latest(await rows(A)));
  assert.equal((await B.meta('syncChallenges', [])).length, 1);
  await A.delChallenge('c1'); await B.mergeRemote(latest(await rows(A))); // B learns of the tombstone
  assert.deepEqual(await B.meta('syncChallenges', []), []);
  await A.mergeRemote(latest(await rows(B))); assert.deepEqual(await A.meta('syncChallenges', []), []); // and the old copy never resurrects it
});
test('tombstone removes the item from the device that still had it, and reports the list as changed so the app refreshes it', async () => {
  const A = mk(), B = mk(); await A.putAlarm(al('x', 'x')); await B.mergeRemote(latest(await rows(A))); await A.delAlarm('x');
  const changed = await B.mergeRemote(latest(await rows(A))); assert.ok(changed.includes('syncTomb') && changed.includes('syncAlarms'));
});
test('malformed remote rows are ignored without throwing', async () => {
  const B = mk(); await B.putAlarm(al('k', 'keep'));
  await B.mergeRemote([{ key: 'syncAlarms', value: 'oops', updated_at: 'x' }, { key: 'syncAlarms', value: [null, 5, { label: 'no id' }], updated_at: 'x' }, { key: 'syncTomb', value: [1, 2], updated_at: 'x' }, { key: 'syncTomb', value: { z: 'nan' }, updated_at: 'x' }]);
  assert.deepEqual((await B.meta('syncAlarms', [])).map(o => o.id), ['k']);
});
