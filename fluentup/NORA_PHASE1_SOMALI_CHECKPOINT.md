# NORA Somali Localization Checkpoint — Writing Batch 1

Date: 25 November 2026
Project: NORA / FluentUp v0.9.0

## Scope completed
- Added Somali titles (`titleSo`) and learner-facing task instructions (`promptSo`) to all 19 writing tasks across `writing.json`, `writing2.json`, and `writing3.json`.
- Added Somali sample answers (`modelSo`) for every task that already has an English model answer.
- Preserved the task `w-ess1` without inventing a sample answer because its source data has no English model answer.
- Updated the Writing screen to show the Somali title and prompt alongside the English learning task, and to show the Somali sample answer when the English model answer is displayed.
- Added an automated test ensuring all 19 writing tasks have Somali titles/prompts and all existing model answers have Somali counterparts.

## Verification
- `npm test`: **141/141 passed** (including the new Writing Somali localization test).
- `npm run build`: **passed** (`www/ ready`).
- The generated `www/` build output is included in this checkpoint.

## Not yet completed
- Somali translation quality has not yet been independently reviewed by a native Somali-language editor.
- Reading, Conversations, Professional English, Vocabulary, Grammar, Listening, and app-wide interface localization remain to be audited/completed.
- Browser/device testing and live Supabase verification remain outstanding.

## Important scope note
This is a working checkpoint, not a final release. Existing English learning prompts and model answers remain intact; Somali is shown as supporting learner guidance.
