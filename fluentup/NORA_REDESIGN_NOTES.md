# NORA 1.0 redesign notes

## Interface changes
- A1, A2, B1, B2, C1 and C2 are presented as separate CEFR level cards.
- The selected level filters vocabulary, grammar, reading, professional lessons, conversations, listening, speaking prompts and writing tasks.
- The selected level is saved in the learner profile.
- Header: NORA wordmark at left, Profile shortcut at right; old logo, online badge, search and settings shortcuts removed.
- Profile page now contains name editing, sign out, delete account, learning settings, progress, analytics and backup.
- Removed the initial Home loading text; AI Tutor loading is a compact in-screen status.
- Login/signup card is shorter and login buttons no longer animate on tap.

## Account actions
- Name change uses the authenticated Supabase user update endpoint.
- Sign out uses Supabase Auth.
- Delete account is secured through `supabase/functions/delete-account/index.ts`. Deploy it with `supabase functions deploy delete-account` before using the button in production. The service-role key stays on the server and is never bundled into the app.

## Verification
- `npm test`: 157 tests pass.
- `npm run build`: successful; `www/` regenerated.
- Playwright browser/a11y screenshots could not be rerun in this environment because the Chromium executable is not installed.
- Live Supabase account deletion and real Android device behavior still require deployment/device testing.
