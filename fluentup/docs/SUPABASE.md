# Supabase setup (not tested against a live project)

1. Create a project. In the SQL editor run `db/schema.sql`, then migrations `002`, `003`, `004`, `005` (AI Tutor rate limit) and `006` (rate-limit lock). The AI Tutor also needs the `tutor` Edge Function and its secrets: see `docs/TUTOR.md`. (Schema/migrations were **never executed** by the author; run them on a throwaway project first and test RLS with two users.)
2. Load content into `entries` (e.g. `node tools/import.mjs in.jsonl outdir`, then insert via service role). Card sync has a foreign key to `entries`.
3. Copy `config.example.js` to `config.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Never put the `service_role` key in the client. `config.js` is gitignored.
4. Auth: enable the Email provider and require email confirmation. In Authentication → Email Templates → Confirm signup, use the numeric token placeholder `{{ .Token }}` so NORA can ask the learner for the 6-digit code. Set Site URL and redirect URLs for password recovery. Test sign-up, code verification, sign-in and sign-out with two separate Gmail accounts.
5. Security model: RLS on every user table (`user_id = auth.uid()`), `entries` read-only for clients, `apply_card` runs as invoker. Add automated RLS tests before production.


## Sync model (v0.3.0)
- Push: outbox ops (`apply_card` RPC for cards, `user_meta` upsert for everything else). Challenges, alarms, mistakes, bookmarks and reading history are now queued as `user_meta` keys (`syncChallenges`, `syncAlarms`, `lessonMist`, `lessonSaved`, `readHist`).
- Pull (new): after each push, `sb.pull()` reads `user_meta` and `card_states` (RLS limits rows to the signed-in user) and merges: `days`/`saved`/`rest` are unioned, other keys are last-writer-wins by `updated_at`, cards newest `updatedAt` wins (local review history is kept; the server has no history).
- Unit-tested with mocked fetch only. **Migrations were never run on a real Postgres and RLS was never tested against a live project.**

## Seeding `entries` (required before card sync works)
`card_states.entry_id` references `entries(id)`. Generate the CSV of all bundled entries with `npm run seed:export` (writes `import-out/entries.csv`), load it with `\copy entries_staging ...` as described in `db/migrations/003_import_staging.sql`, then run the merge insert with the service role. Not executed against a live project.

## Static checks
`tests/db-schema.test.js` reads the migration text only. It cannot prove RLS behaviour; test with two real accounts (user A must not see or modify user B's `user_meta`/`card_states`) on a real Supabase project.

## List sync
Alarms and challenges are stored in `user_meta` as `syncAlarms` / `syncChallenges` and merged client-side by id; deletions travel in `syncTomb`.


## NORA account screen
- The app now presents a branded Gmail + password sign-in/sign-up screen when Supabase is configured.
- New accounts receive a six-digit signup code by email. The learner enters that code in the app to verify the account.
- Local IndexedDB is separated by Supabase user ID (`nora-user-<id>`). Signing out and using another account will not expose the previous account's local learning progress.
- Cloud sync still depends on the database schema and RLS being installed and tested. The public client key is safe to expose; never use the `service_role` key in `config.js`.

## NORA authentication notes
- Signup requires a display name, a Gmail address and a password of at least 8 characters. The name is sent as Supabase Auth user metadata (`full_name`) and copied into the local learning profile after verification.
- The app restores the persisted session at startup and refreshes it only when it is expired or within 60 seconds of expiry. If refresh fails, it clears the stale session and shows the login screen.
- Without valid Supabase URL + anon/publishable key, the app shows a configuration warning and never falls through to the Home screen. There is no demo-login path.
- The client-side Gmail validation accepts `@gmail.com` addresses only, as requested. The public anon/publishable key may be exposed in the client; never use `service_role`.
- Email OTP delivery is controlled by Supabase Auth email templates and SMTP configuration. For production, configure custom SMTP and test delivery to external Gmail inboxes.


## Secure account deletion (NORA 1.0)

The Profile screen's Delete account action calls the `delete-account` Supabase Edge Function. Deploy it before enabling account deletion in production:

```sh
supabase functions deploy delete-account
```

The function uses the platform `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets. The service-role key must remain server-side and must never be added to `config.js` or the client bundle. The function verifies the caller's access token before deleting only that user's Auth account.
