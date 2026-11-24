-- Per-user key/value progress (lesson scores, goals, settings, writing/speaking logs). RLS: owner only. NOT yet executed on a live database.
create table if not exists user_meta(
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null check (char_length(key) between 1 and 64),
  value jsonb not null check (pg_column_size(value) < 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, key));
alter table user_meta enable row level security;
create policy user_meta_own on user_meta for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
