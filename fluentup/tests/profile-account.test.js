import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabase } from '../src/core/supabase.js';

test('profile name update uses authenticated Supabase user endpoint and persists returned metadata', async () => {
  const mem = {};
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/token?grant_type=password')) return { ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, user: { id: 'u1', user_metadata: {} } }) };
    if (url.endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'u1', user_metadata: { full_name: 'New Name' } }) };
    throw new Error('unexpected URL ' + url);
  };
  const sb = createSupabase({ url: 'https://x.supabase.co', anonKey: 'anon', fetch, storage: { getItem: k => mem[k] ?? null, setItem: (k,v) => mem[k]=v, removeItem: k => delete mem[k] } });
  await sb.signIn('learner@gmail.com', 'password123');
  await sb.updateUser({ full_name: 'New Name' });
  assert.equal(sb.user().user_metadata.full_name, 'New Name');
  const req = calls.find(x => x.url.endsWith('/auth/v1/user'));
  assert.equal(req.init.method, 'PUT');
  assert.equal(req.init.headers.Authorization, 'Bearer access');
  assert.deepEqual(JSON.parse(req.init.body), { data: { full_name: 'New Name' } });
});

test('account deletion calls the secure Edge Function with the current access token', async () => {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/token?grant_type=password')) return { ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, user: { id: 'u1' } }) };
    if (url.endsWith('/functions/v1/delete-account')) return { ok: true, json: async () => ({ ok: true }) };
    throw new Error('unexpected URL ' + url);
  };
  const sb = createSupabase({ url: 'https://x.supabase.co', anonKey: 'anon', fetch, storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  await sb.signIn('learner@gmail.com', 'password123');
  assert.deepEqual(await sb.deleteAccount(), { ok: true });
  const req = calls.find(x => x.url.endsWith('/functions/v1/delete-account'));
  assert.equal(req.init.method, 'POST');
  assert.equal(req.init.headers.Authorization, 'Bearer access');
  assert.equal(req.init.headers.apikey, 'anon');
});
