import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { createTutor } from '../src/core/tutor.js';
const res = (status, body) => ({ ok: status < 300, status, json: async () => body });
test('tutor client: success, auth, rate limit, offline; no key in client', async () => {
  let seen; const f = async (u, o) => { seen = { u, o }; return res(200, { reply: 'I am going.' }); };
  const ask = createTutor({ url: 'https://x.supabase.co/', token: () => 't', fetchImpl: f });
  assert.deepEqual(await ask([{ role: 'user', content: 'I am go' }]), { ok: true, reply: 'I am going.' });
  assert.equal(seen.u, 'https://x.supabase.co/functions/v1/tutor'); assert.equal(seen.o.headers.authorization, 'Bearer t');
  assert.equal((await createTutor({ url: '', token: () => '' })([{ role: 'user', content: 'a' }])).error, 'auth');
  assert.equal((await createTutor({ url: 'u', token: () => 't', fetchImpl: async () => res(429, { error: 'rate_limited' }) })([{ role: 'user', content: 'a' }])).error, 'rate_limited');
  assert.equal((await createTutor({ url: 'u', token: () => 't', fetchImpl: async () => { throw new Error('x'); } })([{ role: 'user', content: 'a' }])).error, 'offline');
});
test('server side: key only from env, JWT required, rate check, RLS on usage table', () => {
  const rd = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8'), fn = rd('supabase/functions/tutor/index.ts') + rd('supabase/functions/tutor/core.ts'), sql = rd('db/migrations/005_tutor_rate.sql');
  assert.match(fn, /env\('ANTHROPIC_API_KEY'\)/); assert.doesNotMatch(fn, /sk-ant-/); assert.match(fn, /auth\.getUser/); assert.match(fn, /tutor_rate_check/);
  assert.match(sql, /enable row level security/); assert.match(sql, /set search_path/);
  for (const f of ['src/app.js', 'src/core/tutor.js', 'src/core/tutorChat.js', 'src/ui/tutorScreen.js']) assert.doesNotMatch(rd(f), /sk-ant-|ANTHROPIC_API_KEY/);
});
