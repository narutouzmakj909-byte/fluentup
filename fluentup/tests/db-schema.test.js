import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync, readdirSync } from 'node:fs';
// Static guards only. These read the SQL text; they do NOT prove behaviour on a live Postgres/Supabase.
const dir = new URL('../db/migrations/', import.meta.url), sql = readdirSync(dir).sort().map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
const tables = [...sql.matchAll(/create (?:unlogged )?table (?:if not exists )?(?:public\.)?(\w+)/gi)].map(m => m[1]).filter(t => t !== 'entries_staging');
const loopTables = [...(sql.match(/foreach t in array array\[([^\]]+)\]/i)?.[1].matchAll(/'(\w+)'/g) ?? [])].map(m => m[1]);
const rls = new Set([...sql.matchAll(/alter table (?:public\.)?(\w+)\s+enable row level security/gi)].map(m => m[1]).concat(loopTables));
test('every table in the migrations has row level security enabled', () => { for (const t of tables) assert.ok(rls.has(t), `RLS missing on ${t}`); assert.ok(tables.length >= 8); });
test('user-owned tables default user_id to auth.uid() and cascade on user delete', () => {
  for (const t of ['card_states', 'study_days', 'alarms', 'challenges', 'sync_ops', 'user_meta']) {
    const body = sql.match(new RegExp(`create table (?:if not exists )?${t}\\((.*?)\\);`, 'is'))?.[1] ?? ''; assert.match(body, /user_id uuid not null default auth\.uid\(\) references auth\.users on delete cascade/i, t); }
});
test('no policy lets anyone but the owner write: only profiles/user-owned policies use for all, entries are read-only', () => {
  const pols = [...sql.matchAll(/create policy\s+(\S+)\s+on\s+(\w+)\s+for\s+(\w+)/gi)].map(m => ({ name: m[1], table: m[2], cmd: m[3].toLowerCase() }));
  assert.ok(pols.some(p => p.table === 'entries' && p.cmd === 'select')); assert.ok(!pols.some(p => p.table === 'entries' && p.cmd !== 'select'));
  assert.ok(!/to\s+anon/i.test(sql), 'no policy may grant anon access'); assert.ok(!/using\s*\(\s*true\s*\)[^;]*with check/i.test(sql));
});
test('only the auth trigger function is security definer; every function pins search_path', () => {
  const fns = [...sql.matchAll(/create (?:or replace )?function\s+(?:public\.)?(\w+)([\s\S]*?)\$\$/gi)];
  for (const [, name, head] of fns) { assert.match(head, /set search_path\s*=/i, name + ' search_path'); if (/security definer/i.test(head)) assert.equal(name, 'handle_new_user'); }
  assert.ok(fns.some(m => m[1] === 'apply_card' && /security invoker/i.test(m[2])));
});
test('apply_card reads exactly the fields the client sends', () => {
  const client = readFileSync(new URL('../src/core/store.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/core/supabase.js', import.meta.url), 'utf8');
  for (const f of ['id', 'state', 'ease', 'interval', 'reps', 'lapses', 'due', 'updatedAt']) { assert.ok(sql.includes(`p->>'${f}'`), 'sql reads ' + f); }
  assert.match(client, /rpc\/apply_card/);
});
