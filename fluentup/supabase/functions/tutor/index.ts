// NORA AI tutor — Supabase Edge Function (Deno). Entry point only; the logic lives in core.ts (unit-tested in Node).
// Secrets (set with `supabase secrets set`, never in the app): ANTHROPIC_API_KEY (required), ALLOWED_ORIGINS (required for browsers), TUTOR_MODEL (optional).
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by the platform. See docs/TUTOR.md.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handle } from './core.ts';

// A client that acts as the caller (their JWT), so RLS and auth.uid() apply to everything it does.
const asUser = (token: string) => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(req => handle(req, {
  env: name => Deno.env.get(name),
  fetch: (url, init) => fetch(url, init),
  authenticate: async token => {
    const { data, error } = await asUser(token).auth.getUser(token);
    if (error) { if (error.status && error.status >= 500) throw error; return null; } // 4xx = bad/expired token; 5xx = auth outage
    return data?.user ? { id: data.user.id } : null;
  },
  rateCheck: async token => {
    const { data, error } = await asUser(token).rpc('tutor_rate_check'); // 30/hour and 200/day per user (db/migrations/005_tutor_rate.sql)
    if (error) throw error;
    return data === true;
  },
}));
