# FluentUp — project state (v0.9.0, Ultra Premium Liquid Glass)

## v0.9.0 Liquid Glass redesign — COMPLETE (details and exact verification list in CONTINUATION.md)
- Design system in `src/styles/app.css` + components in `src/ui/glass.js`; every screen, button, tab, chip, field, toggle, progress, nav, sheet and modal uses it in light and dark. Home is a dashboard; Settings uses segmented tabs; deletes use a centered glass modal; quiz answers give animated feedback; reduced motion and keyboard use are supported.
- Verified by running: 96 unit tests, build, Playwright e2e (18 + 4 + 12 checks), layout audit at 320/390/412 px, and a measured contrast audit (460 text runs, 0 failures).
- Not verified: real devices/other engines, rendered no-backdrop-filter fallback, every scroll offset. No Premium screen exists in the app.

## Earlier: v0.8.0 notes

## v0.8.0 changes (on top of v0.7.0 below; this section wins where they differ)
- Content now: library 151 entries, grammar 25, reading 20, listening 20, writing 19, conversations 21 (first A1 and C2 dialogues), professional 14 (first A2 and C2 lessons). Still all "unverified", Somali null/unreviewed. Generators: tools/gen-seed4.mjs, gen-content4.mjs, gen-content5.mjs.
- CORRECTION to v0.7.0 notes: alarms, challenges and the mistake list DO sync (as synced meta lists). The real weakness was last-writer-wins on the whole list. Now merged union-by-id with deletion tombstones (`syncTomb`), so two offline devices keep both additions and a deletion is not resurrected (src/core/store.js, tests/list-sync.test.js). Tombstones are never pruned (small).
- Offline: the service worker precache list was incomplete (first offline launch depended on runtime caching). It is now derived from the real imports and data loads, and tests/sw-shell.test.js fails if it drifts. Cache version v11.
- Backup reminder card on Home when there is progress and no backup in 14 days (`backupDue`, `lastBackup`).
- Supabase (static only): tests/db-schema.test.js checks that every table has RLS, user tables default user_id to auth.uid(), entries are read-only to clients, only handle_new_user is security definer, all functions pin search_path, and apply_card reads exactly the fields the client sends. `npm run seed:export` writes import-out/entries.csv for the server `entries` table (card sync has a foreign key to it). None of this was run against a live database.
- Tests: all pass (see CONTINUATION.md for the current count); Playwright e2e (browser.py, backup.py) pass.
- STILL NOT DONE / NOT VERIFIABLE HERE: Android APK (no android/ folder; needs SDK + network), live Supabase run of the migrations and RLS with two accounts, human review of content and Somali, real-device testing (microphone, speech recognition, background reminders), recordings are not in backups.

## v0.7.0 summary (previous release notes)

## v0.7.0 summary (authoritative; older text below is historical)
- Content (src/data): library 129 entries, grammar 25 lessons, reading 18, listening 18, writing 19 prompts, conversations 18, professional 11. All authored for FluentUp and marked "unverified"; Somali fields are empty or unreviewed. A human reviewer is needed before treating accuracy as confirmed.
- UI: design system in `src/styles/app.css`. All main screens use the shared components: Home, Onboarding, Review, Quiz, Library + detail, Grammar list + lesson runner, Skills (Talk with chat bubbles, Listen, Speak, Write), Plan (streak hero, goal, challenges, calendar, reminders), Me/Progress, Settings. New text-size setting (small to extra large); saved theme and text size are now applied at startup (previously the saved theme was not restored after reload).
- Fixes: grammar3 lessons were never loaded (v0.6.0); saved theme not applied at boot; analytics table, alarm field and calendar overflowed at large text sizes.
- Learning system: early correct practice (e.g. quiz on a card that is not due) is logged but no longer stretches the review schedule; early mistakes still count as lapses.
- Data protection: Settings > Back up & restore. Export a JSON file; restore validates strictly (rejects wrong/oversized/corrupt files, drops malformed cards) and MERGES non-destructively (longer/newer history wins, sets unioned, best scores kept, local preferences never overwritten). Speaking recordings are not included. Logic in `src/core/backup.js`.
- Accessibility: key colour pairs measured at >= 4.5:1 (light and dark); stat summary for screen readers; focus-visible rings; reduced-motion respected; buttons, inputs and chips >= 44px; no horizontal overflow at 320/360/412px width even at extra-large text (checked in Chromium on all main tabs).
- Verified in this environment: `npm test` all pass; `npm run build` ok; Playwright e2e `tests/e2e/browser.py` and `tests/e2e/backup.py` pass against a local static server (`python3 -m http.server 8099` in the project root after `npm run build`), no console errors.
- NOT verified: Android APK (see docs/ANDROID.md; there is no generated `android/` folder in this repo), any live Supabase project or the SQL migrations (never executed; RLS only reviewed statically), real phones, microphone/speech recognition on a device, background reminders.
- Known limits: challenges, alarms and the mistake list do not sync; sync conflict policy is last-write-wins for settings and newest-update-wins for cards; backups are manual.

## Historical notes (v0.4.0, superseded by the section above)

Stack: dependency-free ES modules (no bundler, no runtime deps). `npm test` = node:test. Serve: `npm run serve` (http://localhost:8080). Build for Android: see docs/ANDROID.md. Supabase: see docs/SUPABASE.md.

## Verified in this environment
- `npm test`: **57 `npm test` tests pass** (53 + 4 new content/persistence tests) (re-run this session; 44 original + 2 conversation + 5 sync/analytics/notification + 2 content) and a **real-Chromium e2e script** (`tests/e2e/browser.py`, 18 checks incl. branching conversation, listening levels, fake-device recording that survives reload; mobile 390px: 16 conversations, reading bookmark/history/filter, monthly+weekly analytics, dark mode, IndexedDB persistence, offline reload, no horizontal overflow, no console errors) passes; the original 33 + 3 from session 2 preserved; new: modules2, app-skills).
- Real Chromium (Playwright) run against `python3 -m http.server`: app boots, onboarding, grammar lesson with mcq/fill/correct/order exercises, listening, **real microphone recording + playback (fake media device)**, self-rating persisted, writing check, challenge pause UI, dark mode screenshot (mobile 390px), IndexedDB persistence across reload, service worker registered, **offline reload works**. Only console issue: optional `config.js` 404 (expected when Supabase is not configured).
- NOT verified: real Android device, real microphone on a phone, real speech recognition, real Supabase project, Postgres migrations (never executed), RLS tests.

## Implemented and integrated
| Area | State |
|---|---|
| Vocabulary/phrases/idioms/phrasal verbs/slang/professional entries | 6 + 31 entries (37 total) (seed.json, seed2.json), validated + deduped, filter/search/bookmark/SRS review. Phrasal verbs show separable flag; slang shows register/region/**usage warning**. No "trending" claims. **Content is original, status `unverified`; Somali text on most new entries is unreviewed and must be checked by a native speaker.** |
| Grammar A1–C2 | 14 lessons (3 original + 11 new, every CEFR level), explanation, Somali note, examples, common mistakes, exercises: mcq, fill, **sentence correction, sentence ordering (tap words)**, feedback, scoring, best-score progress, level filter, **wrong answers collected in a Mistake review** (Me → Practise) |
| Reading, Professional | Existing lessons (2 + email/meeting), unchanged |
| Conversations | **16 dialogues** A2–C1 (2 original + 14 new in conversations2.json, built by tools/gen-conversations.mjs): shop, restaurant, airport, hotel, directions, phone booking, meeting, customer complaint, university, interview, social, bank, presentation Q&A, doctor. Validated, scored, cached offline. Short (3 turns) and unverified; not all requested scenario types (e.g. B2–C2 breadth, Somali notes) covered. |
| Listening | 4 lessons A1–B2, device text-to-speech playback, speed, replay, per-sentence play, transcript hide/show, comprehension questions, progress. **No recorded audio files exist; voice = device TTS.** Without TTS support the UI says so |
| Speaking | Capability detection, real recording (MediaRecorder), stop, playback, delete, repeat-after-me, optional browser speech recognition (word match only), self-rating, progress. **No automatic pronunciation score — stated in the UI.** Recordings are now saved on-device (see v0.4.0), not synced |
| Writing | 5 prompts (sentence → essay), rule-based checks (length, capitals, punctuation, "I", repeats, register, required words), a few common-error patterns, word-choice suggestions, history, progress. **Labelled "rule-based, not AI".** |
| Study discipline | Daily goal, 7/30/90/180/365/custom challenges, streaks, rest days, calendar, achievements, **challenge pause/resume (paused days not counted as missed)**, alarms |
| Analytics (Me) | Reviews/day, mistakes/day, active study minutes (7-day bar charts), skill summary for vocab/grammar/reading/professional/conversation/listening/speaking/writing — all from stored data |
| Search | Unified: entries, lessons, conversations, **listening, writing**; recent searches; client-side |
| Onboarding / profile / settings | Dismissible welcome card (name, level, goal), theme light/dark/system, snooze, recommended-next card |
| Offline | IndexedDB (MemoryStore fallback), service worker app-shell cache, outbox with retry/backoff, LWW conflict resolution, online/offline indicator, pending count |
| Supabase | `src/core/supabase.js` (sign up/in/out/recover, apply_card RPC, `user_meta` upsert), migration 004 (RLS), `config.example.js`. **Unit-tested with mocked fetch only.** |
| Android | `capacitor.config.json`, `tools/build-www.mjs`, scripts, PWA manifest; **no APK built** |

## Known limitations (honest)
- Library is **37 entries**, not millions. The import/validate/dedupe/staging pipeline and schema (tsvector/trigram indexes) exist; content volume does not. Client search is linear, fine for thousands, not millions (use server search at scale).
- Sync: card progress and synced meta (days, goal, saved, rest, lesson/convo/listening progress, speaking/writing logs, profile) are queued. **Challenges, alarms and mistake list stay local-only.** Server stores latest card state only (no review history). Entries must exist on the server (FK) — load them with tools/import.mjs / staging first.
- Alarms fire only while the page is open (+ in-app snooze banner). Background reminders need Capacitor Local Notifications (not wired; see docs/ANDROID.md).
- No React/TypeScript/Tailwind migration; UI is a single `app.js` with string templates.
- Accessibility: labels, focus rings, reduced motion, 44px targets, aria-live; **no formal audit/screen-reader test**.
- Reading (2) and professional (2) remain small; conversations are 16 but short. Reading has no history/bookmark UI beyond progress.
- Charts are simple CSS bars; no monthly view.
- Content (grammar, entries, listening, writing) is authored for FluentUp and unverified by a teacher.


## v0.3.0 changes (this session)
- Reading: 13 passages A1–C2 (11 new in reading2.json) with glossary + 3 comprehension questions each; **bookmarks and reading history** (Learn → Reading/Professional); wrong answers feed the Mistake review. Professional: 8 lessons (6 new: interviews, presentations, phone calls, reports, negotiation, workplace vocabulary).
- Library: +46 deduplicated entries (seed3.json; word/phrase/idiom/phrasal verb/slang/collocation/professional), **83 total**. Somali left null on all new entries (no unreviewed translations). All unverified.
- Analytics: weekly and monthly tables + monthly chart + longest streak, from stored data only.
- Sync: **pull + merge added** (previously push-only); challenges, alarms, mistakes, bookmarks, reading history now sync. Not run against a live Supabase.
- Notifications: `src/core/notify.js` native scheduling via Capacitor LocalNotifications; no-op in browsers; **not run on a device**.
- Design: small polish only. **The full premium redesign was NOT done**; the UI is still one string-template `app.js`.
- Still not done: APK (no SDK/network), live Supabase/RLS/migration tests, 3M-entry library (83 real entries), reading beyond 13 passages, accessibility audit with a screen reader, Somali review, listening/writing/grammar expansion this session.


## v0.4.0 changes
- Listening: 12 lessons A1–C2 (8 new, listening2.json), each with 3 comprehension questions; still **device text-to-speech, no recorded audio files** (labelled in the UI).
- Writing: 14 prompts (9 new) covering sentence, paragraph, opinion, email, complaint, essay, report, cover letter at A1–C2; feedback remains rule-based, not AI.
- Conversations: 18 (2 new genuinely **branching** ones: faulty-phone refund, flatmate disagreement; different choices change the other person's next line). Other 16 remain short linear dialogues.
- Speaking: recordings are **persisted in IndexedDB** (newest 30, local only, never synced because audio blobs are large). Verified in Chromium with a fake microphone device; **not verified on a real phone microphone**.
- IndexedDB schema bumped to v2 (adds `recordings`); existing v1 databases upgrade in place (upgrade path covered by logic, not by a separate migration test).
- Still NOT done: full premium redesign (only the earlier light polish), React/TS migration, APK, live Supabase/RLS/migration run, library of millions (83 entries), more grammar lessons (still 14), formal accessibility audit, Somali review, pronunciation scoring (not reliably possible without an external service).

## v0.5.0 changes
- Grammar: +11 lessons (grammar3.json, generated by tools/gen-grammar3.mjs): present simple, time prepositions, present continuous, modals of obligation, relative clauses, used to, future forms, gerund/infinitive, mixed conditionals, participle clauses, nominalisation. **25 lessons total, A1–C2.** Each has 4 exercises (mcq/fill/correct/order). Somali null (unreviewed), status unverified.
- Housekeeping: removed stray `{src` directory, package.json version synced to 0.5.0, `www/` git-ignored, service worker cache bumped to v9 and lists grammar3.
- Verified: `npm test` 59/59; `npm run build` ok; Chromium e2e 18/18, no console errors.
- Unchanged and still NOT done: APK build, live Supabase/migration/RLS run, premium redesign / React-TS migration, large library (83 entries), formal accessibility audit, Somali review, pronunciation scoring.
