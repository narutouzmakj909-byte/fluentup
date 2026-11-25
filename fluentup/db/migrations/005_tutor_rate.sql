-- Per-user rate limit for the AI tutor. RLS on, no client policies: only the SECURITY INVOKER-safe function below touches it.
create table if not exists public.tutor_usage (user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, at timestamptz not null default now());
create index if not exists tutor_usage_user_at on public.tutor_usage (user_id, at desc);
alter table public.tutor_usage enable row level security;
create policy tutor_usage_own_insert on public.tutor_usage for insert to authenticated with check (user_id = auth.uid());
create policy tutor_usage_own_read on public.tutor_usage for select to authenticated using (user_id = auth.uid());
create or replace function public.tutor_rate_check() returns boolean language plpgsql set search_path = public as $$
declare h int; d int;
begin
  if auth.uid() is null then return false; end if;
  select count(*) filter (where at > now() - interval '1 hour'), count(*) into h, d from public.tutor_usage where user_id = auth.uid() and at > now() - interval '1 day';
  if h >= 30 or d >= 200 then return false; end if;
  insert into public.tutor_usage(user_id) values (auth.uid()); return true;
end $$;
revoke all on function public.tutor_rate_check() from public; grant execute on function public.tutor_rate_check() to authenticated;
