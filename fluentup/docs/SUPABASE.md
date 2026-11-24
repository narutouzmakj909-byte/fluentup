# Supabase setup (not tested against a live project)

1. Create a project. In the SQL editor run `db/schema.sql`, then migrations `002`, `003`, `004`. (Schema/migrations were **never executed** by the author; run them on a throwaway project first and test RLS with two users.)
2. Load content into `entries` (e.g. `node tools/import.mjs in.jsonl outdir`, then insert via service role). Card sync has a foreign key to `entries`.
3. Copy `config.example.js` to `config.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Never put the `service_role` key in the client. `config.js` is gitignored.
4. Auth: enable Email provider; set Site URL and redirect URLs for password recovery.
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
