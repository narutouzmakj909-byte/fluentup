import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
test('app.js boots against a fake DOM, renders Home, and Plan->challenge flow works', async () => {
  const el = () => ({ innerHTML: '', dataset: {}, setAttribute() {}, focus() {}, setSelectionRange() {}, value: '' });
  const app = el(), nav = el(), nodes = { app };
  globalThis.document = { getElementById: id => nodes[id] ?? el(), querySelector: () => nav, querySelectorAll: () => [] };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  globalThis.addEventListener = () => {}; globalThis.alert = () => {};
  const seed = readFileSync(new URL('../src/data/seed.json', import.meta.url), 'utf8');
  globalThis.fetch = async () => ({ json: async () => JSON.parse(seed) });
  await import('../src/app.js'); // IndexedDB absent -> MemoryStore fallback
  assert.match(app.innerHTML, /Today's goal/); assert.match(app.innerHTML, /None yet/); assert.match(app.innerHTML, /6 new/);
  nav.onclick({ target: { dataset: { t: 'plan' } } }); assert.match(app.innerHTML, /No active challenges/);
  await app.onclick({ target: { dataset: { ch: '7' }, id: '' } }); assert.match(app.innerHTML, /7-day challenge/); assert.match(app.innerHTML, /0\/7 done/);
  nav.onclick({ target: { dataset: { t: 'review' } } }); assert.match(app.innerHTML, /Show answer/);
  await app.onclick({ target: { id: 'show', dataset: {} } }); await app.onclick({ target: { dataset: { g: '5' }, id: '' } });
  nav.onclick({ target: { dataset: { t: 'home' } } }); assert.match(app.innerHTML, /1\/5 reviews/); assert.match(app.innerHTML, /First review|Streak: 1/);
});
