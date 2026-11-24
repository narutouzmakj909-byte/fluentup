import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const J = f => readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8');
test('Listen, Speak, Write, order/correct exercises, mistakes, pause/resume, analytics, onboarding, search', async () => {
  const els = {}, el = () => ({ innerHTML: '', dataset: {}, setAttribute() {}, focus() {}, setSelectionRange() {}, value: '' });
  const app = el(), nav = el(); els.app = app; for (const k of ['obn', 'obl', 'obg', 'lnfill', 'lfill', 'wtext']) els[k] = el();
  globalThis.document = { getElementById: id => els[id] ??= el(), querySelector: () => nav, querySelectorAll: () => [], documentElement: { dataset: {} } };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true }); globalThis.addEventListener = () => {};
  const files = ['seed', 'seed2', 'grammar', 'grammar2', 'grammar3', 'reading', 'professional', 'conversations', 'listening', 'writing'];
  globalThis.fetch = async u => ({ json: async () => JSON.parse(J(files.find(f => new RegExp(`/${f}\\.json`).test(u)) ?? 'seed')) });
  await import('../src/app.js'); const go = t => nav.onclick({ target: { dataset: { t } } }), click = (d, id = '') => app.onclick({ target: { dataset: d, id } }), H = () => app.innerHTML;
  // onboarding + new content in library
  go('home'); assert.match(H(), /Welcome/); els.obn.value = 'Amina'; els.obl.value = 'B1'; els.obg.value = '8'; await click({}, 'obsave');
  assert.doesNotMatch(H(), /Welcome/); assert.match(H(), /Hi, Amina/); assert.match(H(), /0\/8 reviews/);
  // listening
  go('speak'); assert.match(H(), /Ordering at a café/); await click({ sk: 'listen' }); assert.match(H(), /At the bus stop/); assert.match(H(), /not recorded human audio/);
  await click({ lnopen: 'l1' }); assert.match(H(), /hidden/); await click({ lntr: '1' }); assert.match(H(), /bus to the city centre/);
  await click({ lnq: '1' }); assert.match(H(), /Where does the bus go/); await click({ lna: '1' }); assert.match(H(), /Correct/); await click({ lnnext: '1' });
  await click({ lna: '1' }); await click({ lnnext: '1' }); els.lnfill.value = 'two'; await click({}, 'lnsubmit'); await click({ lnnext: '1' });
  assert.match(H(), /3\/3 correct/); await click({ lnback: '1' }); assert.match(H(), /best 100% · 1 attempt/);
  // speaking is honest about capability and scoring
  await click({ sk: 'speak' }); assert.match(H(), /No automatic pronunciation score/); assert.match(H(), /Recording: not supported/); assert.match(H(), /disabled/);
  // writing
  await click({ sk: 'write' }); assert.match(H(), /Write about yourself/); await click({ wopen: 'w-sent1' }); els.wtext.value = 'i like like tea'; await click({}, 'wcheck');
  assert.match(H(), /Rule-based feedback/); assert.match(H(), /not AI/); assert.match(H(), /capital letter/); await click({ wback: '1' }); assert.match(H(), /History/);
  // grammar: plurals (mcq, fill, correct, order) -> perfect score
  go('library'); await click({ lm: 'grammar' }); assert.match(H(), /First conditional/); assert.doesNotMatch(H(), /Regular and irregular plurals/); await app.onchange({ target: { id: 'gl', value: '' } }); assert.match(H(), /Regular and irregular plurals/); await click({ ls: 'g-plurals' }); assert.match(H(), /Common mistakes/); assert.match(H(), /Somali/); await click({ lstart: '1' });
  await click({ lo: '1' }); await click({ lnext: '1' }); els.lfill.value = 'boxes'; await click({}, 'lsubmit'); await click({ lnext: '1' });
  els.lfill.value = 'I have three children.'; await click({}, 'lsubmit'); assert.match(H(), /Correct/); await click({ lnext: '1' });
  for (const i of [2, 1, 0, 3]) await click({ ow: String(i) }); await click({ ok: '1' }); assert.match(H(), /Correct/); await click({ lnext: '1' }); assert.match(H(), /4\/4 correct/);
  // a wrong answer is tracked and appears in mistake review
  await click({ lback: '1' }); await click({ ls: 'g-past-simple' }); await click({ lstart: '1' }); await click({ lo: '0' }); assert.match(H(), /Not quite/);
  go('me'); assert.match(H(), /1 grammar exercise\(s\) answered wrongly/); assert.match(H(), /Listening: 1 done/); assert.match(H(), /Writing: 1 submissions/); assert.match(H(), /Reviews, last 7 days/);
  await click({ mist: '1' }); assert.match(H(), /Mistake review/);
  // unified search finds listening
  go('library'); await click({ lm: 'search' }); app.oninput({ target: { id: 'gq', value: 'bus', selectionStart: 3 } }); assert.match(H(), /At the bus stop/);
  // new entry types in library
  await click({ lm: 'library' }); assert.match(H(), /phrasal verb|break the ice/);
  // pause / resume challenge
  go('plan'); await click({ ch: '7' }); const id = H().match(/data-cp="([^"]+)"/)[1]; await click({ cp: id }); assert.match(H(), /PAUSED since/); await click({ cp: id }); assert.doesNotMatch(H(), /PAUSED since/);
  // cloud sync absent by default
  go('me'); assert.match(H(), /Cloud sync is not configured/);
});
