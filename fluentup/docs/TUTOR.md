# NORA AI Tutor — setup, deployment and testing

**Status: built and unit/browser-tested with a stubbed backend. NOT verified against a deployed Supabase project or the real AI provider.** Do not call it live until you have deployed the function and completed "How to test it live" below.

## How it works
`Me → sign in` gives the app a Supabase session. The Tutor screen (top-bar ✦ button or the "AI Tutor" tile on Home) sends the last ≤20 messages to the Edge Function `tutor` (`POST {SUPABASE_URL}/functions/v1/tutor`) with `Authorization: Bearer <user access token>`. The function verifies the user, validates the payload, spends one unit of the per-user quota (`tutor_rate_check`: 30/hour, 200/day), calls the AI provider with a server-side system prompt, and returns `{ reply, truncated }`. The provider key exists only in function secrets.

Files: `supabase/functions/tutor/{index.ts,core.ts}`, `src/core/{tutor.js,tutorChat.js}`, `src/ui/tutorScreen.js`, `db/migrations/{005,006}`.

## 1. Database
Run in the Supabase SQL editor (after `db/schema.sql` and migrations 002–004): `db/migrations/005_tutor_rate.sql`, then `006_tutor_rate_lock.sql` (adds a per-user advisory lock so parallel requests cannot all slip under the limit). Neither has been executed against a live Postgres by the author. `tutor_usage` grows by one row per question; optionally delete rows older than 2 days on a schedule (for example pg_cron) — do not add a delete policy for users, that would let them reset their own quota.

## 2. Secrets / environment variables (function side only)
```
supabase secrets set ANTHROPIC_API_KEY=...            # required, never put in the app
supabase secrets set ALLOWED_ORIGINS=https://your-app.example,https://localhost
supabase secrets set TUTOR_MODEL=claude-haiku-4-5     # optional; this is the default
```
`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided by the platform. The app needs only `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`); never the service_role key. Provider: Anthropic Messages API (the only one implemented). Confirm the model id exists on your account.

## 3. Deploy
```
supabase functions deploy tutor        # keep JWT verification on (the default); the function also checks the user itself
```

## 4. CORS / allowed origins
`ALLOWED_ORIGINS` is a comma-separated list of exact origins (scheme + host + port, no path). The function answers a browser only if its `Origin` is in the list, echoes that single origin (never `*`; a `*` entry is ignored) and sends `Vary: Origin`. Preflight (`OPTIONS`) returns 204 with `Access-Control-Allow-Methods: POST, OPTIONS` and headers `authorization, content-type, apikey, x-client-info`. Requests with no `Origin` (curl, native code) are not blocked by CORS but still need a valid user token. If the variable is unset, **no browser origin is allowed**. Typical values: your web host (`https://nora.example`), local dev (`http://localhost:8080`), the Capacitor Android WebView (`https://localhost`, from `androidScheme: https` in `capacitor.config.json`; verify the actual origin on your device). Supabase may handle JWT checks at its gateway before preflight; if a browser preflight fails after deployment, check the function logs and the Supabase docs for CORS with `verify_jwt`.

## 5. Behaviour and limits
Somali-first explanations with levels A1–C2 and an explanation-language setting (Somali-heavy / mixed / English-heavy); understands instructions such as "Af-Soomaali igu sharax", "English kaliya ila hadal", "Grammar-kayga sax", "I sii quiz", "Ila practice garee". Limits: user message ≤1500 chars, ≤20 messages of context, ≤16 000 chars total, body ≤64 KB, reply ≤1000 tokens (a "Continue" button appears when cut), 25 s provider timeout. Status codes: 400 bad input/JSON, 401 auth, 403 origin, 405 method, 413 too large, 429 rate limit, 502/503 provider or infrastructure problem, 504 timeout. Messages and tokens are never logged.

## 6. Privacy
Chat history is stored **only on the device**, per signed-in account, through the existing local store (IndexedDB `meta`). It is not synced, not in backups, and "Clear chat" deletes it. Signing out keeps it on the device under that account's key. Messages are sent to the AI provider to be answered; the app tells the learner not to share passwords or ID numbers.

## 7. How to test it live (after deploying)
1. With a real user token: `curl -i -X POST $URL/functions/v1/tutor -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"I am go to school"}],"level":"A1"}'` → 200 with `reply`.
2. Same call without the header → 401. With `-H "Origin: https://evil.example"` → 403.
3. Preflight: `curl -i -X OPTIONS ... -H "Origin: https://your-app.example" -H "Access-Control-Request-Method: POST"` → 204 with the headers above.
4. Send 31 questions within an hour as one user → the 31st returns 429. Test with two accounts that RLS on `tutor_usage` keeps them apart.
5. In the app: sign in, open the Tutor, ask, close and reopen the app, confirm history is there.

## 8. Automated tests
`npm test` (Node 22.6 or newer; the Edge Function logic in `core.ts` is imported directly, so no Deno is needed. `npm test` passes `--experimental-strip-types`, which Node versions before 22.18 need to load `.ts` files; running `node --test` by hand on 22.6-22.17 needs that flag too): `tests/tutor*.test.js`. Browser check with the backend stubbed: `tests/e2e/tutor.py` (needs Playwright; see the header of the file).

## 9. Known limitations
Not deployed/verified live; Somali wording of the UI and the system prompt is machine-written and needs native review; history does not sync across devices; no streaming (the answer appears when complete); the quota is spent before the provider is called, so provider failures still count; real-device keyboard behaviour (iOS/Android) was not tested; Retry-After is a generic hint.
