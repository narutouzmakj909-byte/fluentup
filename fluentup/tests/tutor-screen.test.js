// Tutor screen controller with injected dependencies: real Repo + MemoryStore for persistence, a scripted `ask` instead of the network.
import test from 'node:test'; import assert from 'node:assert/strict';
import { Repo, MemoryStore } from '../src/core/store.js';
import { createTutorScreen } from '../src/ui/tutorScreen.js';
import { histKey } from '../src/core/tutorChat.js';
const gate = () => { let go; const p = new Promise(r => { go = r; }); return { p, go }; };
function setup(o = {}) {
  const store = o.store ?? new MemoryStore(), repo = new Repo(store), env = { uid: o.uid === undefined ? 'u1' : o.uid, online: true, asks: [], answer: o.answer ?? (async () => ({ ok: true, reply: 'Correct: **I am going.**' })), confirmed: true, rerenders: 0 };
  const scr = createTutorScreen({ repo, configured: o.configured ?? true, user: () => (env.uid ? { id: env.uid } : null), signedIn: () => !!env.uid, online: () => env.online, rerender: () => { env.rerenders++; }, defaultLevel: () => o.level ?? 'A2',
    ask: async (m, opts) => { env.asks.push({ m, opts }); return env.answer(m, opts); }, confirm: async () => env.confirmed });
  return { store, repo, env, scr, st: scr.state };
}
const ready = async o => { const x = setup(o); await x.scr.load(); return x; };
test('view states: not configured, signed out, loading, then the chat with welcome + Somali quick prompts', async () => {
  assert.match(setup({ configured: false }).scr.view(), /needs cloud setup/); assert.match(setup({ uid: null }).scr.view(), /data-t="me"/);
  const x = setup(); assert.match(x.scr.view(), /Preparing your tutor/); assert.equal(x.scr.needsLoad(), true); await x.scr.load(); assert.equal(x.scr.needsLoad(), false);
  const v = x.scr.view(); assert.match(v, /Ku soo dhawow NORA Tutor/); assert.match(v, /id="tin"/); assert.match(v, /id="tsend"[^>]*disabled/); assert.match(v, /data-tchip="0"/); assert.match(v, /Af-Soomaali igu sharax/); assert.match(v, /role="log"/); assert.match(v, /data-tclear="1"[^>]*disabled/);
  assert.match(v, /<option value="A2" selected>/); assert.match(v, /aria-label="Message to the tutor"/); assert.ok(!/You are offline/.test(v));
});
test('send: real ask call with level, user message + reply rendered, history persisted and restored by a fresh screen', async () => {
  const x = await ready(); x.env.asks.length = 0; assert.equal(await x.scr.send('  I am go  '), true);
  assert.equal(x.env.asks.length, 1); assert.deepEqual(x.env.asks[0].m, [{ role: 'user', content: 'I am go' }]); assert.equal(x.env.asks[0].opts.level, 'A2'); assert.equal(x.env.asks[0].opts.somaliLevel, 'high'); assert.ok(x.env.asks[0].opts.signal);
  assert.deepEqual(x.st.msgs.map(m => [m.role, m.status ?? '']), [['user', 'sent'], ['assistant', '']]); assert.equal(x.st.busy, false);
  const v = x.scr.view(); assert.match(v, /I am go/); assert.match(v, /<strong>I am going\.<\/strong>/); assert.ok(!/Ku soo dhawow/.test(v));
  // "close and reopen the app": new screen, same storage
  const y = await ready({ store: x.store }); assert.deepEqual(y.st.msgs.map(m => m.content), ['I am go', 'Correct: **I am going.**']);
  assert.equal((await y.repo.meta(histKey('u1'), []))[0].content, 'I am go');
  await y.scr.send('Why?'); assert.deepEqual(y.env.asks[0].m.map(m => m.role), ['user', 'assistant', 'user']); // conversation context is carried
});
test('chat history is device-local: never queued for sync, never in another account’s view', async () => {
  const x = await ready(); await x.scr.send('private text'); assert.equal((await x.repo.pending()).length, 0);
  const b = await ready({ store: x.store, uid: 'u2' }); assert.deepEqual(b.st.msgs, []); assert.ok(!b.scr.view().includes('private text')); await b.scr.send('bob only'); const a = await ready({ store: x.store, uid: 'u1' }); assert.ok(a.st.msgs.every(m => !m.content.includes('bob'))); assert.ok(a.st.msgs.some(m => m.content === 'private text'));
  // switching account in the same session reloads the right history
  x.env.uid = 'u2'; assert.equal(x.scr.needsLoad(), true); await x.scr.load(); assert.deepEqual(x.st.msgs.map(m => m.content).filter(c => c === 'private text'), []); x.scr.reset(); assert.equal(x.scr.view().includes('private text'), false);
});
test('duplicate submissions are blocked while a request is in flight (double tap / key repeat)', async () => {
  const g = gate(), x = await ready({ answer: async () => { await g.p; return { ok: true, reply: 'one reply' }; } });
  const p1 = x.scr.send('hello'), p2 = x.scr.send('hello'), p3 = x.scr.send('hello again'); assert.equal(await p2, false); assert.equal(await p3, false); assert.equal(x.st.busy, true); assert.match(x.scr.view(), /id="tsend"[^>]*disabled/); assert.match(x.scr.view(), /typing/);
  g.go(); await p1; assert.equal(x.env.asks.length, 1); assert.equal(x.st.msgs.filter(m => m.role === 'user').length, 1); assert.equal(x.st.busy, false);
});
test('failure keeps the message, shows the error with Retry, and retry sends it again without duplicating it', async () => {
  let n = 0, x = await ready({ answer: async () => (++n === 1 ? { ok: false, error: 'unavailable', message: 'Tutor-ku hadda lama heli karo. (Tutor unavailable.)' } : { ok: true, reply: 'Now it works' }) });
  await x.scr.send('Where you live?'); const u = x.st.msgs[0]; assert.equal(u.status, 'failed'); assert.equal(u.error.code, 'unavailable'); assert.equal(x.st.msgs.length, 1);
  let v = x.scr.view(); assert.match(v, /Where you live\?/); assert.match(v, /role="alert"/); assert.match(v, /Tutor-ku hadda lama heli karo/); assert.match(v, new RegExp(`data-tretry="${u.id}"`));
  assert.equal((await ready({ store: x.store })).st.msgs[0].status, 'failed'); // survives a restart
  await x.scr.retry(u.id); assert.deepEqual(x.st.msgs.map(m => [m.role, m.status ?? '']), [['user', 'sent'], ['assistant', '']]); assert.equal(x.env.asks.at(-1).m.length, 1); assert.ok(!/data-tretry/.test(x.scr.view()));
  assert.equal(await x.scr.retry(u.id), false); // nothing left to retry
});
test('rate limit, auth and bad input errors are shown; only retryable ones get a Retry button', async () => {
  for (const [code, msg, canRetry] of [['rate_limited', 'Waad ka badisay xadka hadda. Fadlan yar sug.', true], ['auth', 'Fadlan gal akoonkaaga', false], ['bad_input', 'Fariintu way dheer tahay', false], ['timeout', 'wakhti dheer', true]]) {
    const x = await ready({ answer: async () => ({ ok: false, error: code, message: msg }) }); await x.scr.send('hi'); const v = x.scr.view(); assert.match(v, new RegExp(msg)); assert.equal(/data-tretry/.test(v), canRetry, code); assert.equal(/data-t="me"/.test(v), code === 'auth'); }
});
test('offline: the message is kept as failed without calling the network, and can be retried once back online', async () => {
  const x = await ready(); x.env.online = false; x.env.asks.length = 0; await x.scr.send('I need help'); assert.equal(x.env.asks.length, 0); assert.equal(x.st.msgs[0].status, 'failed'); assert.equal(x.st.msgs[0].error.code, 'offline'); assert.match(x.scr.view(), /You are offline/);
  x.env.online = true; await x.scr.retry(x.st.msgs[0].id); assert.equal(x.env.asks.length, 1); assert.equal(x.st.msgs[0].status, 'sent'); assert.equal(x.st.msgs.length, 2);
});
test('input rules: empty/whitespace ignored, over-length rejected with a message and nothing lost, signed-out/unconfigured never send', async () => {
  const x = await ready(); assert.equal(await x.scr.send('   \n '), false); assert.equal(await x.scr.send(''), false); assert.equal(await x.scr.send(undefined), false); assert.equal(x.env.asks.length, 0);
  assert.equal(await x.scr.send('x'.repeat(1501)), false); assert.match(x.st.err, /1501\/1500/); assert.equal(x.st.msgs.length, 0); assert.equal(x.env.asks.length, 0); assert.match(x.scr.view(), /1501\/1500/);
  assert.equal(await x.scr.send('x'.repeat(1500)), true);
  const out = await ready({ uid: null }); assert.equal(await out.scr.send('hi'), false); const nc = await ready({ configured: false }); assert.equal(await nc.scr.send('hi'), false);
  const inp = { value: 'draft text', style: {} , scrollHeight: 300 }; const y = await ready(); y.scr.onInput(inp); assert.equal(y.st.draft, 'draft text'); assert.equal(inp.style.height, '140px'); assert.match(y.scr.view(), />draft text<\/textarea>/);
  y.scr.onInput({ value: 'a'.repeat(1300), style: {} }); assert.match(y.scr.view(), /class="tcount">1300\/1500/); y.scr.onInput({ value: 'a'.repeat(1600), style: {} }); assert.match(y.scr.view(), /tcount over/);
});
test('Enter sends, Shift+Enter and IME composition do not; Send button and chips work', async () => {
  const x = await ready(), ev = (o = {}) => ({ key: 'Enter', target: { id: 'tin' }, preventDefault() { this.prevented = true; }, ...o });
  x.st.draft = 'hello'; const e1 = ev(); assert.equal(x.scr.onKey(e1), true); assert.equal(e1.prevented, true); await new Promise(r => setTimeout(r, 5)); assert.equal(x.env.asks.length, 1);
  for (const e of [ev({ shiftKey: true }), ev({ isComposing: true }), ev({ key: 'a' }), ev({ target: { id: 'other' } })]) assert.equal(x.scr.onKey(e), false);
  x.st.draft = 'via button'; assert.equal(await x.scr.click({ id: 'tsend' }, {}), true); assert.equal(x.env.asks.length, 2); assert.equal(await x.scr.click({ id: 'x' }, { setk: '1' }), false);
  assert.equal(await x.scr.click({ id: '' }, { tchip: '2' }), true); assert.equal(x.st.draft, 'Grammar-kayga sax: '); assert.ok(x.env.rerenders >= 1); assert.equal(x.env.asks.length, 2); // chips fill the box, they do not spend quota
  assert.equal(await x.scr.click({ id: '' }, { tchip: '99' }), true);
  globalThis.matchMedia = () => ({ matches: true }); try { x.st.draft = 'touch'; assert.equal(x.scr.onKey(ev()), false); } finally { delete globalThis.matchMedia; } // touch screens: Enter = new line
});
test('truncated answers offer Continue, which sends a follow-up', async () => {
  const x = await ready({ answer: async () => ({ ok: true, reply: 'A long answer cut', truncated: true }) }); await x.scr.send('Explain tenses'); assert.match(x.scr.view(), /data-tcont="1"/);
  await x.scr.click({ id: '' }, { tcont: '1' }); assert.match(x.env.asks.at(-1).m.at(-1).content, /Sii wad/); assert.equal(x.st.msgs.filter(m => m.role === 'user').length, 2);
});
test('clear chat: asks first, Cancel keeps everything, confirm deletes it from storage, and a late reply is dropped', async () => {
  const x = await ready(); await x.scr.send('one'); x.env.confirmed = false; await x.scr.clear(); assert.equal(x.st.msgs.length, 2); assert.equal((await x.repo.meta(histKey('u1'), [])).length, 2);
  x.env.confirmed = true; await x.scr.click({ id: '' }, { tclear: '1' }); assert.equal(x.st.msgs.length, 0); assert.deepEqual(await x.repo.meta(histKey('u1'), []), []); assert.match(x.scr.view(), /Ku soo dhawow/);
  const g = gate(), y = await ready({ answer: async () => { await g.p; return { ok: true, reply: 'late' }; } }); const p = y.scr.send('hello'); await new Promise(r => setTimeout(r, 5)); await y.scr.clear(); g.go(); await p;
  assert.equal(y.st.msgs.length, 0); assert.deepEqual(await y.repo.meta(histKey('u1'), []), []); assert.equal(y.st.busy, false); assert.ok(y.env.asks[0].opts.signal.aborted);
});
test('a request interrupted by closing the app comes back as a failed message that can be retried', async () => {
  const store = new MemoryStore(), repo = new Repo(store); await repo.setMeta(histKey('u1'), [{ id: 'm1', role: 'user', content: 'half sent', status: 'pending', at: 1 }]);
  const x = await ready({ store }); assert.equal(x.st.msgs[0].status, 'failed'); assert.match(x.scr.view(), /data-tretry="m1"/); await x.scr.retry('m1'); assert.equal(x.st.msgs[0].status, 'sent');
});
test('preferences: level and explanation language are validated, passed to the tutor, and persisted', async () => {
  const x = await ready(); assert.equal(await x.scr.onChange('tlv', 'C1'), true); assert.equal(await x.scr.onChange('tlv', 'Z9'), false); assert.equal(await x.scr.onChange('tso', 'low'), true); assert.equal(await x.scr.onChange('tso', 'bogus'), false); assert.equal(await x.scr.onChange('zzz', 'x'), false);
  await x.scr.send('hi'); assert.equal(x.env.asks[0].opts.level, 'C1'); assert.equal(x.env.asks[0].opts.somaliLevel, 'low'); const y = await ready({ store: x.store }); assert.equal(y.st.level, 'C1'); assert.equal(y.st.somali, 'low'); assert.equal((await ready({ level: 'B2' })).st.level, 'B2'); // profile level is the default
});
test('history is capped so storage cannot grow without bound', async () => {
  const x = await ready(); for (let i = 0; i < 130; i++) await x.scr.send('m' + i); assert.ok(x.st.msgs.length <= 200); assert.ok((await x.repo.meta(histKey('u1'), [])).length <= 200); assert.equal(x.st.msgs.at(-2).content, 'm129');
});
test('partial refresh updates the message list in place without recreating the textarea', async () => {
  const nodes = {}, el = id => (nodes[id] ??= { id, innerHTML: '', disabled: false, textContent: '', scrollHeight: 500, scrollTop: 0 }); globalThis.document = { getElementById: el, querySelector: () => el('clear') };
  try { const x = await ready(); await x.scr.send('hello there'); assert.match(nodes.tmsgs.innerHTML, /hello there/); assert.match(nodes.tmsgs.innerHTML, /I am going/); assert.equal(nodes.tmsgs.scrollTop, 500); assert.equal(nodes.tin.value, ''); assert.equal(nodes.tsend.disabled, true); assert.equal(nodes.clear.disabled, false); assert.equal(nodes.tin.innerHTML, ''); } finally { delete globalThis.document; }
});
