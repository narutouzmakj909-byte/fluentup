-- Idempotent, last-writer-wins card sync. NOT yet executed on a live database. Runs as the caller, so RLS applies.
create or replace function apply_card(op_id text, p jsonb) returns jsonb language plpgsql security invoker set search_path = public as $$
declare cur card_states; ts timestamptz := to_timestamp((p->>'updatedAt')::bigint / 1000.0);
begin
  insert into sync_ops(op_id) values (apply_card.op_id) on conflict do nothing;
  if not found then return jsonb_build_object('duplicate', true); end if;
  select * into cur from card_states where entry_id = p->>'id';
  if found and cur.updated_at > ts then
    return jsonb_build_object('conflict', true, 'server', jsonb_build_object('id', cur.entry_id, 'state', cur.state, 'ease', cur.ease,
      'interval', cur.interval_days, 'reps', cur.reps, 'lapses', cur.lapses, 'due', (extract(epoch from cur.due) * 1000)::bigint,
      'updatedAt', (extract(epoch from cur.updated_at) * 1000)::bigint));
  end if;
  insert into card_states(entry_id, state, ease, interval_days, reps, lapses, due, updated_at)
  values (p->>'id', p->>'state', (p->>'ease')::real, (p->>'interval')::int, (p->>'reps')::int, (p->>'lapses')::int, to_timestamp((p->>'due')::bigint / 1000.0), ts)
  on conflict (user_id, entry_id) do update set state = excluded.state, ease = excluded.ease, interval_days = excluded.interval_days,
    reps = excluded.reps, lapses = excluded.lapses, due = excluded.due, updated_at = excluded.updated_at;
  return jsonb_build_object('ok', true);
end $$;
-- Known gap: server stores no per-review history; only the latest card state.
