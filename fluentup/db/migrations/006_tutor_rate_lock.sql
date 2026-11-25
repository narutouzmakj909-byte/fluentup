-- Closes a race in tutor_rate_check(): without a lock, many parallel requests from one user could all read "under the limit" before any of them inserted.
-- A per-user transaction-level advisory lock serialises the check+insert for that user only. Same signature, limits (30/hour, 200/day) and grants as 005.
-- Run after 005. NOT executed against a live Postgres by the author.
create or replace function public.tutor_rate_check() returns boolean language plpgsql set search_path = public as $$
declare h int; d int;
begin
  if auth.uid() is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('tutor_rate:' || auth.uid()::text, 0));
  select count(*) filter (where at > now() - interval '1 hour'), count(*) into h, d from public.tutor_usage where user_id = auth.uid() and at > now() - interval '1 day';
  if h >= 30 or d >= 200 then return false; end if;
  insert into public.tutor_usage(user_id) values (auth.uid()); return true;
end $$;
revoke all on function public.tutor_rate_check() from public; grant execute on function public.tutor_rate_check() to authenticated;
