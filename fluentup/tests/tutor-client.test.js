import test from 'node:test'; import assert from 'node:assert/strict';
import { createTutor, tutorMessage, retryable, LIMITS } from '../src/core/tutor.js';
const res = (status, body) => ({ ok: status < 300, status, json: async () => body });
const U = [{ role: 'user', content: 'hello' }];
test('request shape: endpoint, bearer from async token, level/somaliLevel, and clipping of long messages', async () => {
  let seen; const ask = createTutor({ url: 'https://p.supabase.co//', token: async () => 'tok', fetchImpl: async (u, o) => { seen = { u, o, b: JSON.parse(o.body) }; return res(200, { reply: 'ok' }); } });
  assert.deepEqual(await ask([{ role: 'user', content: 'u'.repeat(5000) }, { role: 'assistant', content: 'a'.repeat(9000) }, { role: 'user', content: 'x'.repeat(5000) }, { role: 'system', content: 'ignored' }, null], { level: 'B1', somaliLevel: 'low' }), { ok: true, reply: 'ok' });
  assert.equal(seen.u, 'https://p.supabase.co/functions/v1/tutor'); assert.equal(seen.o.method, 'POST'); assert.equal(seen.o.headers.authorization, 'Bearer tok');
  assert.equal(seen.b.level, 'B1'); assert.equal(seen.b.somaliLevel, 'low'); assert.deepEqual(seen.b.messages.map(m => [m.role, m.content.length]), [['user', LIMITS.user], ['assistant', LIMITS.assistant], ['user', LIMITS.user]]);
  const many = Array.from({ length: 50 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'm' + i })); await ask(many); assert.equal(seen.b.messages.length, LIMITS.messages);
});
test('errors map to stable codes with Somali+English messages', async () => {
  const run = async (status, body) => createTutor({ url: 'u', token: () => 't', fetchImpl: async () => res(status, body) })(U);
  for (const [s, b, code] of [[401, { error: 'auth' }, 'auth'], [401, {}, 'auth'], [429, { error: 'rate_limited' }, 'rate_limited'], [429, {}, 'rate_limited'], [400, { error: 'bad_input' }, 'bad_input'], [413, {}, 'bad_input'], [504, { error: 'timeout' }, 'timeout'], [502, { error: 'unavailable' }, 'unavailable'], [503, { error: 'weird' }, 'unavailable'], [500, null, 'unavailable']]) {
    const r = await run(s, b); assert.equal(r.ok, false); assert.equal(r.error, code, `${s}`); assert.equal(r.message, tutorMessage(code)); assert.match(r.message, /\(/); }
  assert.equal((await run(200, { reply: '' })).error, 'unavailable'); assert.equal((await run(200, {})).error, 'unavailable'); assert.equal((await run(200, { reply: 5 })).error, 'unavailable');
  assert.ok(retryable('offline') && retryable('rate_limited') && retryable('timeout') && !retryable('auth') && !retryable('bad_input'));
  assert.equal(tutorMessage('nope'), tutorMessage('unavailable'));
});
test('signed-out and missing configuration never reach the network', async () => {
  let n = 0; const f = async () => { n++; return res(200, { reply: 'x' }); };
  for (const o of [{ url: '', token: () => 't' }, { url: 'u' }, { url: 'u', token: () => null }, { url: 'u', token: async () => '' }]) assert.equal((await createTutor({ ...o, fetchImpl: f })(U)).error, 'auth'); assert.equal(n, 0);
});
test('truncated replies are flagged; network failure → offline; client timeout → timeout; abort → aborted', async () => {
  assert.deepEqual(await createTutor({ url: 'u', token: () => 't', fetchImpl: async () => res(200, { reply: 'cut', truncated: true }) })(U), { ok: true, reply: 'cut', truncated: true });
  assert.equal((await createTutor({ url: 'u', token: () => 't', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } })(U)).error, 'offline');
  const hang = (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new DOMException('x', 'AbortError'))));
  assert.equal((await createTutor({ url: 'u', token: () => 't', timeoutMs: 20, fetchImpl: hang })(U)).error, 'timeout');
  const ctl = new AbortController(), p = createTutor({ url: 'u', token: () => 't', fetchImpl: hang })(U, { signal: ctl.signal }); ctl.abort(); assert.equal((await p).error, 'aborted');
  const pre = new AbortController(); pre.abort(); let calls = 0; assert.equal((await createTutor({ url: 'u', token: () => 't', fetchImpl: async () => { calls++; return res(200, { reply: 'x' }); } })(U, { signal: pre.signal })).error, 'aborted'); assert.equal(calls, 0);
});
test('a 401 triggers one token refresh and one retry; failed refresh surfaces auth; no retry loop', async () => {
  let tok = 'old', calls = []; const f = async (u, o) => { calls.push(o.headers.authorization); return o.headers.authorization === 'Bearer new' ? res(200, { reply: 'fine' }) : res(401, { error: 'auth' }); };
  assert.deepEqual(await createTutor({ url: 'u', token: () => tok, refresh: async () => { tok = 'new'; return true; }, fetchImpl: f })(U), { ok: true, reply: 'fine' }); assert.deepEqual(calls, ['Bearer old', 'Bearer new']);
  calls = []; tok = 'old'; assert.equal((await createTutor({ url: 'u', token: () => tok, refresh: async () => false, fetchImpl: f })(U)).error, 'auth'); assert.equal(calls.length, 1);
  calls = []; tok = 'old'; assert.equal((await createTutor({ url: 'u', token: () => tok, refresh: async () => true, fetchImpl: f })(U)).error, 'auth'); assert.equal(calls.length, 2); // refreshed but still rejected: stop
  assert.equal((await createTutor({ url: 'u', token: () => 't', refresh: async () => { throw new Error('x'); }, fetchImpl: async () => res(401, {}) })(U)).error, 'auth');
});
