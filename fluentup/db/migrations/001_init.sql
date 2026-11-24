-- FluentUp PostgreSQL (Supabase). NOT yet executed against a live database.
create extension if not exists pg_trgm;
create type cefr as enum ('A1','A2','B1','B2','C1','C2');
create table profiles(id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  daily_goal_minutes int not null default 15 check (daily_goal_minutes between 1 and 600),
  created_at timestamptz not null default now());
create table entries(
  id text primary key,
  type text not null check (type in ('word','phrase','idiom','phrasal_verb','slang','pattern','collocation','sentence','professional')),
  en text not null check (char_length(en) between 1 and 300),
  def text not null, somali text,
  examples jsonb not null check (jsonb_typeof(examples)='array' and jsonb_array_length(examples)>0),
  ipa text, audio_path text, level cefr not null, freq_rank int check (freq_rank > 0),
  category text, region text, register text,
  status text not null default 'unverified' check (status in ('unverified','reviewed','verified')),
  en_norm text generated always as (lower(btrim(en))) stored,
  tsv tsvector generated always as (to_tsvector('english', en || ' ' || def)) stored,
  unique (type, en_norm));
create index entries_tsv on entries using gin (tsv);
create index entries_trgm on entries using gin (en_norm gin_trgm_ops);
create index entries_browse on entries (type, level, freq_rank, id); -- keyset pagination
create table card_states(
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  entry_id text not null references entries on delete cascade,
  state text not null check (state in ('new','learning','difficult','mastered')),
  ease real not null check (ease >= 1.3), interval_days int not null check (interval_days >= 0),
  reps int not null check (reps >= 0), lapses int not null check (lapses >= 0),
  due timestamptz not null, updated_at timestamptz not null default now(),
  primary key (user_id, entry_id));
create index card_states_due on card_states (user_id, due);
create table study_days(user_id uuid not null default auth.uid() references auth.users on delete cascade, day date not null, primary key (user_id, day));
create table alarms(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text not null default '', hour smallint not null check (hour between 0 and 23), minute smallint not null check (minute between 0 and 59),
  days smallint[] not null default '{}', enabled boolean not null default true, updated_at timestamptz not null default now());
create table challenges(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null, start_date date not null, days int not null check (days between 1 and 3650));
create table sync_ops(user_id uuid not null default auth.uid() references auth.users on delete cascade, op_id text not null, applied_at timestamptz not null default now(), primary key (user_id, op_id));
-- RLS: users see only their rows; entries are read-only to clients (writes via service role / import pipeline).
alter table profiles enable row level security;
create policy profiles_own on profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter table entries enable row level security;
create policy entries_read on entries for select to authenticated using (true);
do $$ declare t text; begin
  foreach t in array array['card_states','study_days','alarms','challenges','sync_ops'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_own', t);
  end loop; end $$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values (new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
