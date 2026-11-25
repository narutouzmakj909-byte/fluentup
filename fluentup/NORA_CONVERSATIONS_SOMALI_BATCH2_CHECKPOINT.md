# NORA Somali Localization Checkpoint — Conversations Batch 2

Date: 25 November 2026  
Project: NORA / FluentUp v0.9.0

## Scope completed
- Localized four existing branching conversations: `c-cafe`, `c-interview`, `c-shop`, and `c-restaurant`.
- Added Somali lesson titles (`titleSo`) and scenario descriptions (`contextSo`).
- Added Somali dialogue for every speaker/end node (`saySo`).
- Added Somali translations for every learner response (`textSo`) and explanatory feedback (`feedbackSo`).
- Kept original English dialogue, answer choices, scores, next-node links, and progression unchanged.
- Used the existing app rendering support for Somali titles, scenario descriptions, dialogue, choices, and feedback; no UI redesign was needed.
- Added an automated completeness test for the four conversations.

## Verification
- `npm test`: **146/146 passed**.
- `npm run build`: **passed** (`www/ ready`).
- Conversation structure/branch tests pass; original IDs, scoring, and branching logic are preserved.
- Generated `www/` output is included in this checkpoint.

## Review note
Somali translations are a working draft and have not been independently reviewed by a native Somali-language editor.

## Remaining work
- 15 other conversations still need full Somali localization (including the previous A1 batch and the unfinished diplomacy scenario, depending on the next audit pass).
- Reading comprehension prompts/options/answers/explanations, Listening questions and answer choices, Vocabulary, Grammar, and app-wide interface localization still require work.
- Live Supabase and physical-device testing are not claimed by this checkpoint.
