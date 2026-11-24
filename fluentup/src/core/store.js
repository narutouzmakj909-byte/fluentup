// Persistence adapters + Repo (local-first writes, every change queued in the outbox).
import { Outbox, resolve } from './sync.js';
const STORES = ['cards', 'outbox', 'meta', 'alarms', 'challenges', 'recordings'];
export class MemoryStore {
  d = {};
  async get(s, k) { return structuredClone(this.d[s]?.[k]); }
  async put(s, k, v) { (this.d[s] ??= {})[k] = structuredClone(v); }
  async all(s) { return Object.values(this.d[s] ?? {}).map(v => structuredClone(v)); }
  async del(s, k) { delete this.d[s]?.[k]; }
}
export class IdbStore { // browser-only; same API as MemoryStore
  constructor(name = 'fluentup') {
    this.ready = new Promise((res, rej) => {
      const r = indexedDB.open(name, 2);
      r.onupgradeneeded = () => STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async tx(s, mode, fn) {
    const db = await this.ready;
    return new Promise((res, rej) => { const t = db.transaction(s, mode), rq = fn(t.objectStore(s)); t.oncomplete = () => res(rq?.result); t.onerror = () => rej(t.error); });
  }
  get(s, k) { return this.tx(s, 'readonly', o => o.get(k)); }
  put(s, k, v) { return this.tx(s, 'readwrite', o => o.put(v, k)); }
  all(s) { return this.tx(s, 'readonly', o => o.getAll()); }
  del(s, k) { return this.tx(s, 'readwrite', o => o.delete(k)); }
}
// Alarms/challenges sync as whole lists through synced meta. Merging is union-by-id (so two devices that each add an item offline keep both),
// and deletions travel as tombstones ({id: deletedAt}) so a deleted item is not resurrected by the other device's older copy.
export const LIST_KEYS = { syncAlarms: 'alarms', syncChallenges: 'challenges' };
export const unionById = (a = [], b = []) => { const m = new Map(); for (const o of a) if (o?.id) m.set(o.id, o); for (const o of b) if (o?.id) { const c = m.get(o.id); if (!c || (o.updatedAt ?? 0) > (c.updatedAt ?? 0)) m.set(o.id, o); } return [...m.values()]; };
export class Repo {
  constructor(store) { this.s = store; }
  async saveCard(card) {
    const c = { ...card, updatedAt: Date.now() }, id = `card:${c.id}:${c.updatedAt}`;
    await this.s.put('cards', c.id, c); await this.s.put('outbox', id, { id, kind: 'card', payload: c }); return c;
  }
  cards() { return this.s.all('cards'); }
  pending() { return this.s.all('outbox'); }
  async meta(k, d) { return (await this.s.get('meta', k)) ?? d; }
  setMeta(k, v) { return this.s.put('meta', k, v); }
  // Synced meta: stored locally and queued for the server (kind 'meta', last-writer-wins by updatedAt).
  async putMeta(k, v) { const at = Date.now(), id = `meta:${k}:${at}`; await this.s.put('meta', k, v); await this.s.put('meta', '_at:' + k, at); await this.s.put('outbox', id, { id, kind: 'meta', payload: { key: k, value: v, updatedAt: at } }); }
  // Merge rows pulled from the server ({key,value,updated_at}). Set-like keys are unioned; others are last-writer-wins. Returns changed keys.
  async mergeRemote(rows, union = ['days', 'saved', 'rest']) {
    const changed = []; let tomb = (await this.s.get('meta', 'syncTomb')) ?? {};
    const rt = (rows ?? []).find(r => r?.key === 'syncTomb')?.value;
    if (rt && typeof rt === 'object' && !Array.isArray(rt)) { let tc = false; for (const [id, at] of Object.entries(rt)) if (typeof at === 'number' && (tomb[id] ?? 0) < at) { tomb = { ...tomb, [id]: at }; tc = true; } if (tc) { await this.putMeta('syncTomb', tomb); changed.push('syncTomb'); } }
    for (const { key, value, updated_at } of rows ?? []) {
      if (typeof key !== 'string' || key.startsWith('_at:') || key === 'syncTomb') continue;
      if (LIST_KEYS[key] && Array.isArray(value)) {
        const at = Date.parse(updated_at) || 0, la = (await this.s.get('meta', '_at:' + key)) ?? 0, cur = await this.s.get('meta', key), curL = Array.isArray(cur) ? cur : [];
        const nv = unionById(curL, value.filter(o => o?.id && !tomb[o.id])).filter(o => !tomb[o.id]); if (JSON.stringify(nv) === JSON.stringify(curL)) continue;
        await this.s.put('meta', key, nv); await this.s.put('meta', '_at:' + key, Math.max(at, la)); changed.push(key);
        const rid = new Set(value.map(o => o?.id)); if (nv.length !== value.length || nv.some(o => !rid.has(o.id))) await this.putMeta(key, nv); // push the merged list back
        continue; }
      const at = Date.parse(updated_at) || 0, la = (await this.s.get('meta', '_at:' + key)) ?? 0, cur = await this.s.get('meta', key);
      if (union.includes(key) && Array.isArray(cur) && Array.isArray(value)) {
        const nv = [...new Set([...cur, ...value])]; if (nv.length === cur.length) continue;
        await this.s.put('meta', key, nv); await this.s.put('meta', '_at:' + key, Math.max(at, la)); changed.push(key);
        if (nv.length > value.length) await this.putMeta(key, nv); // push the merged set back
      } else if (at > la) { await this.s.put('meta', key, value); await this.s.put('meta', '_at:' + key, at); changed.push(key); }
    }
    if (changed.includes('syncTomb')) for (const key of Object.keys(LIST_KEYS)) { const cur = await this.s.get('meta', key); if (Array.isArray(cur) && cur.some(o => tomb[o?.id])) { await this.s.put('meta', key, cur.filter(o => !tomb[o?.id])); if (!changed.includes(key)) changed.push(key); } }
    return changed;
  }
  // Merge server card states: newest updatedAt wins; history is kept from local (server stores only latest state).
  async mergeCards(rows) { let n = 0; for (const r of rows ?? []) { const cur = await this.s.get('cards', r.id); if (!cur || (r.updatedAt ?? 0) > (cur.updatedAt ?? 0)) { await this.s.put('cards', r.id, { ...(cur ?? { history: [] }), ...r, history: cur?.history ?? [] }); n++; } } return n; }
  // Speaking recordings: local only (audio Blobs are never queued for sync). Newest 30 kept.
  async recordings() { return (await this.s.all('recordings')).sort((a, b) => a.at - b.at); }
  async putRecording(r) { await this.s.put('recordings', r.id, r); const all = await this.recordings(); for (const o of all.slice(0, Math.max(0, all.length - 30))) await this.s.del('recordings', o.id); }
  delRecording(id) { return this.s.del('recordings', id); }
  alarms() { return this.s.all('alarms'); }
  async putAlarm(a) { await this.s.put('alarms', a.id, a); await this.pushList('syncAlarms', 'alarms'); }
  async tombstone(id) { await this.putMeta('syncTomb', { ...((await this.s.get('meta', 'syncTomb')) ?? {}), [id]: Date.now() }); }
  async delAlarm(id) { await this.s.del('alarms', id); await this.tombstone(id); await this.pushList('syncAlarms', 'alarms'); }
  // Challenges/alarms live in their own stores; the whole list is also queued as one synced meta value so other devices can restore it.
  async pushList(key, store) { await this.putMeta(key, await this.s.all(store)); }
  // Replace a store with a list pulled from the server (no re-queue).
  async replaceList(store, list) { for (const o of await this.s.all(store)) await this.s.del(store, o.id); for (const o of list ?? []) if (o?.id) await this.s.put(store, o.id, o); }
  challenges() { return this.s.all('challenges'); }
  async putChallenge(c) { await this.s.put('challenges', c.id, c); await this.pushList('syncChallenges', 'challenges'); }
  async delChallenge(id) { await this.s.del('challenges', id); await this.tombstone(id); await this.pushList('syncChallenges', 'challenges'); }
  // send(op) -> may throw (offline) or return {conflict:true, server}. Failed ops stay queued with backoff.
  async sync(send, now = Date.now()) {
    const before = await this.pending(), ob = new Outbox(before), r = await ob.flush(send, now);
    const keep = new Map(ob.q.map(o => [o.id, o]));
    for (const o of before) keep.has(o.id) ? await this.s.put('outbox', o.id, keep.get(o.id)) : await this.s.del('outbox', o.id);
    for (const { op, server } of r.conflicts) await this.s.put('cards', op.payload.id, resolve(op.payload, server));
    return r;
  }
}
