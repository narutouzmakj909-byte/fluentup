import { setupSignedInAuthFixture, cleanupAuthFixture } from './auth-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));

test('CEFR sections stay separate in Learn and Skills; profile shortcut opens redesigned profile', async () => {
  const el = () => ({ innerHTML: '', dataset: {}, setAttribute() {}, focus() {}, setSelectionRange() {}, value: '', onclick: null });
  const app = el(), nav = el(), profile = el(), nodes = { app, tbProfile: profile };
  globalThis.document = { getElementById: id => nodes[id] ?? el(), querySelector: () => nav, querySelectorAll: () => [], documentElement: { dataset: {} } };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true }); globalThis.addEventListener = () => {};
  globalThis.fetch = async url => {
    const m = String(url).match(/\/([^/]+)\.json(?:\?.*)?$/); const name = m?.[1] ?? 'seed';
    try { return { json: async () => read(name) }; } catch { return { json: async () => [] }; }
  };
  setupSignedInAuthFixture(); await import('../src/app.js'); cleanupAuthFixture();
  const go = t => nav.onclick({ target: { dataset: { t } } });
  const click = d => app.onclick({ target: { dataset: d, id: '' } });
  go('library'); await click({ lm: 'grammar' }); await click({ level: 'A1' });
  assert.match(app.innerHTML, /The verb to be/); assert.doesNotMatch(app.innerHTML, /Second and third conditional/);
  await click({ level: 'B2' }); assert.match(app.innerHTML, /Second and third conditional/); assert.doesNotMatch(app.innerHTML, /The verb to be/);
  go('speak'); await click({ sk: 'listen' }); await click({ level: 'A1' });
  assert.match(app.innerHTML, /At the bus stop/); assert.doesNotMatch(app.innerHTML, /Remote working debate/);
  profile.onclick(); assert.match(app.innerHTML, /Profile/); assert.match(app.innerHTML, /Personal details/); assert.match(app.innerHTML, /Delete account/); assert.match(app.innerHTML, /id="saveName"/);
});
