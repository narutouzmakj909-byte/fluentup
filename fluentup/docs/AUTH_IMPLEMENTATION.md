# NORA Authentication implementation

## What changed
- `src/app.js`: authentication is now a hard entry gate. Without Supabase configuration or a valid session, the app displays the NORA login/signup UI instead of Home. Signup collects a display name, Gmail address and password; signup sends `full_name` to Supabase Auth metadata. Email OTP is required before entering the app. Password visibility has an animated eye control. Auth actions show busy states and prevent duplicate submissions.
- `src/core/supabase.js`: added startup session restoration/refresh before the user-specific IndexedDB database is selected. Invalid refresh credentials clear the stale session; transient network failures retain it for a later retry. Signup submits the display name as Auth user metadata.
- `src/ui/glass.js` and `src/styles/app.css`: added eye/eye-off icons and lightweight auth control motion that respects reduced-motion settings.
- `sw.js`: bumped the cache version so deployed clients download the updated authentication files.
- `www/`: rebuilt for Capacitor from the updated source.
- `tests/`: added coverage for name metadata and persisted-session refresh; app UI tests use a temporary signed-in test fixture.

## Supabase dashboard setup required
1. In **Authentication → Providers → Email**, enable Email provider and turn **Confirm email** on. The app deliberately refuses a signup response that contains a session without email confirmation, so OTP cannot be bypassed by a misconfigured project.
2. In **Authentication → Email Templates → Confirm signup**, use the numeric token placeholder `{{ .Token }}` in the message. Keep the token six digits (the app validates six numeric digits).
3. Configure **Authentication → SMTP Settings** with a production SMTP provider: verified sender address/domain, SMTP host, port (typically 465 or 587), username and password. Supabase's default email sender is suitable only for limited testing and may be rate-limited; custom SMTP is recommended for real Gmail delivery.
4. Set **Authentication → URL Configuration → Site URL** to the deployed NORA origin. Add the production and local development origins to allowed redirect URLs. This is especially important for password recovery.
5. Run the database schema and migrations in `docs/SUPABASE.md` before enabling cloud progress sync. Confirm RLS policies for `user_meta` and `card_states` with two real accounts.

## Client configuration
Copy `config.example.js` to `config.js` in the project root and set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or the project's publishable key if supported by the current project)

Never put the Supabase `service_role` key in browser or Android client code. The app requires this configuration and will not show Home in demo/offline-auth mode.

## Build and checks
- `npm test` — 154 tests pass.
- `npm run build` — rebuilds `www/` for Capacitor.
- `npm run android:sync` — rebuilds and syncs the Android project after configuration is present.

## Important verification boundary
The implementation is covered by mocked/unit tests, but it has not been exercised against the user's live Supabase project or live SMTP provider. Complete the dashboard steps above and test signup, OTP delivery/verification, login, logout, session restoration and sync with two real Gmail accounts before production release.
