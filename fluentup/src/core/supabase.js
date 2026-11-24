// Minimal Supabase client over fetch (GoTrue + PostgREST). No secrets in code: url/anonKey come from config.js (gitignored template provided).
// NOT tested against a live Supabase project; unit tests use a mocked fetch.
export function createSupabase({ url, anonKey, fetch: f = globalThis.fetch, storage = null }) {
  if (!url || !anonKey) return null;
  let session = null; try { session = JSON.parse(storage?.getItem('fluentup.session') ?? 'null'); } catch {}
  const save = s => { session = s; try { s ? storage?.setItem('fluentup.session', JSON.stringify(s)) : storage?.removeItem('fluentup.session'); } catch {} };
  const hdr = auth => ({ apikey: anonKey, 'Content-Type': 'application/json', ...(auth && session ? { Authorization: `Bearer ${session.access_token}` } : {}) });
  const call = async (path, body, auth, method = 'POST') => { const r = await f(url + path, { method, headers: hdr(auth), body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.msg || j.error_description || j.message || 'request failed'), { status: r.status }); return j; };
  const sess = j => { if (j.access_token) save({ access_token: j.access_token, refresh_token: j.refresh_token, user: j.user, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 }); return j; };
  return {
    user: () => session?.user ?? null, signedIn: () => !!session,
    signUp: async (email, password) => sess(await call('/auth/v1/signup', { email, password })),
    signIn: async (email, password) => sess(await call('/auth/v1/token?grant_type=password', { email, password })),
    recover: email => call('/auth/v1/recover', { email }),
    refresh: async () => { if (!session?.refresh_token) throw new Error('no session'); return sess(await call('/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token })); },
    signOut: async () => { try { if (session) await call('/auth/v1/logout', {}, true); } finally { save(null); } },
    // Pull: user_meta rows and card states for the signed-in user (RLS limits rows to the owner). Throws on failure.
    pull: async () => {
      if (!session) throw new Error('not signed in');
      const get = async q => { const r = await f(url + q, { headers: hdr(true) }); if (!r.ok) throw new Error('pull failed'); return r.json(); };
      const meta = await get('/rest/v1/user_meta?select=key,value,updated_at'), cs = await get('/rest/v1/card_states?select=entry_id,state,ease,interval_days,reps,lapses,due,updated_at');
      const cards = cs.map(c => ({ id: c.entry_id, state: c.state, ease: c.ease, interval: c.interval_days, reps: c.reps, lapses: c.lapses, due: Date.parse(c.due), updatedAt: Date.parse(c.updated_at) }));
      return { meta, cards };
    },
    // Outbox sender: cards via apply_card RPC (idempotent by op id); other kinds via user_meta upsert. Throws when offline/unauthorised so Outbox retries.
    send: async op => {
      if (!session) throw new Error('not signed in');
      if (op.kind === 'card') return call('/rest/v1/rpc/apply_card', { op_id: op.id, p: op.payload }, true);
      if (op.kind === 'meta') { const r = await f(url + '/rest/v1/user_meta?on_conflict=user_id,key', { method: 'POST', headers: { ...hdr(true), Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ key: op.payload.key, value: op.payload.value, updated_at: new Date(op.payload.updatedAt).toISOString() }) }); if (!r.ok) throw new Error('meta sync failed'); return { ok: true }; }
      throw new Error('unknown op kind ' + op.kind);
    } };
}
