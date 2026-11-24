import test from 'node:test'; import assert from 'node:assert/strict';
import { MemoryStore, Repo } from '../src/core/store.js';
import { createSupabase } from '../src/core/supabase.js';
import { monthly, weekly, streakHistory } from '../src/core/analytics.js';
import { buildSchedule, syncNative, nativeAvailable } from '../src/core/notify.js';
test('mergeRemote: set keys are unioned and pushed back; other keys are last-writer-wins', async () => {
  const r = new Repo(new MemoryStore()); await r.putMeta('days', ['2026-01-01']); await r.putMeta('goal', { vocab: 5 });
  const old = new Date(Date.now() - 1e7).toISOString(), fresh = new Date(Date.now() + 1e7).toISOString();
  const ch = await r.mergeRemote([{ key: 'days', value: ['2026-01-02'], updated_at: old }, { key: 'goal', value: { vocab: 9 }, updated_at: fresh }, { key: 'challenges', value: [{ id: 'x' }], updated_at: old }]);
  assert.deepEqual((await r.meta('days')).sort(), ['2026-01-01', '2026-01-02']); assert.deepEqual(await r.meta('goal'), { vocab: 9 }); assert.deepEqual(await r.meta('challenges'), [{ id: 'x' }]);
  assert.equal(ch.length, 3); assert.ok((await r.pending()).some(o => o.payload.key === 'days' && o.payload.value.length === 2));
  const stale = await r.mergeRemote([{ key: 'goal', value: { vocab: 1 }, updated_at: old }]); assert.deepEqual(stale, []); assert.deepEqual(await r.meta('goal'), { vocab: 9 });
});
test('mergeCards: newer server state wins, local history is kept', async () => {
  const r = new Repo(new MemoryStore()); await r.saveCard({ id: 'w1', state: 'new', reps: 0, history: [{ at: 1, grade: 4 }] });
  assert.equal(await r.mergeCards([{ id: 'w1', state: 'learning', reps: 3, updatedAt: Date.now() + 1e6 }, { id: 'w2', state: 'new', reps: 0, updatedAt: 5 }]), 2);
  const c = (await r.cards()).find(x => x.id === 'w1'); assert.equal(c.reps, 3); assert.equal(c.history.length, 1);
});
test('supabase.pull sends the user token and maps card rows; fails when signed out', async () => {
  const calls = []; const f = async (u, o) => { calls.push([u, o.headers]); return { ok: true, json: async () => u.includes('user_meta') ? [{ key: 'goal', value: 1, updated_at: 'x' }] : [{ entry_id: 'w1', state: 'new', ease: 2.5, interval_days: 1, reps: 1, lapses: 0, due: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }] }; };
  const store = { s: null, getItem() { return JSON.stringify({ access_token: 'tok', user: { id: 'u' } }); } };
  const sb = createSupabase({ url: 'http://x', anonKey: 'k', fetch: f, storage: store }); const r = await sb.pull();
  assert.equal(r.cards[0].id, 'w1'); assert.equal(r.cards[0].interval, 1); assert.equal(calls[0][1].Authorization, 'Bearer tok'); assert.equal(r.meta.length, 1);
  const out = createSupabase({ url: 'http://x', anonKey: 'k', fetch: f, storage: { getItem: () => null } }); await assert.rejects(out.pull());
});
test('monthly and weekly analytics use only stored data', () => {
  const t = s => Date.parse(s + 'T12:00:00Z'), cards = [{ history: [{ at: t('2026-10-03'), grade: 4 }, { at: t('2026-10-04'), grade: 1 }, { at: t('2026-11-20'), grade: 5 }] }];
  const m = monthly(cards, [{ day: '2026-11-20', ms: 600000 }], ['2026-11-20', '2026-10-03'], '2026-11-22', 3);
  assert.deepEqual(m.map(x => x.month), ['2026-09', '2026-10', '2026-11']); assert.equal(m[0].accuracy, null); assert.equal(m[1].reviews, 2); assert.equal(m[1].accuracy, 50); assert.equal(m[2].minutes, 10); assert.equal(m[2].studyDays, 1);
  const w = weekly(cards, [], ['2026-11-20'], '2026-11-22', 2); assert.equal(w[1].reviews, 1); assert.equal(w[1].studyDays, 1);
  assert.equal(streakHistory(['2026-01-01', '2026-01-02', '2026-01-05'], []), 2); assert.equal(streakHistory(['2026-01-01', '2026-01-03'], ['2026-01-02']), 3);
});
test('native notifications: schedule shape, no-op without plugin, replaces pending with plugin', async () => {
  const al = [{ id: 'a', hour: 8, minute: 30, label: 'Study', days: [1, 3], enabled: true }, { id: 'b', hour: 9, minute: 0, days: [], enabled: true }, { id: 'c', hour: 1, minute: 0, days: [2], enabled: false }];
  const s = buildSchedule(al); assert.equal(s.length, 3); assert.deepEqual(s[0].schedule.on, { weekday: 2, hour: 8, minute: 30 }); assert.equal(new Set(s.map(x => x.id)).size, 3);
  assert.equal(nativeAvailable(), false); assert.deepEqual(await syncNative(al), { available: false, scheduled: 0 });
  const log = []; globalThis.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: { checkPermissions: async () => ({ display: 'prompt' }), requestPermissions: async () => ({ display: 'granted' }), createChannel: async () => {}, getPending: async () => ({ notifications: [{ id: 5 }] }), cancel: async x => log.push(['cancel', x]), schedule: async x => log.push(['schedule', x.notifications.length]) } } };
  try { assert.deepEqual(await syncNative(al), { available: true, scheduled: 3 }); assert.deepEqual(log, [['cancel', { notifications: [{ id: 5 }] }], ['schedule', 3]]); } finally { delete globalThis.Capacitor; }
});
