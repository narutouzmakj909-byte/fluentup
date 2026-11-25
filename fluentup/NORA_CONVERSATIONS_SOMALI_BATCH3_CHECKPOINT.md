# NORA Somali Localization Checkpoint — Conversations Batch 3

Date: 25 November 2026  
Project: NORA / FluentUp v0.9.0

## Scope completed
- Localized four existing conversations: `c-airport`, `c-hotel`, `c-directions`, and `c-phone`.
- Added Somali lesson titles and scenario descriptions.
- Added Somali translations for every dialogue line, including terminal lines.
- Added Somali translations for every learner response and explanatory feedback.
- Preserved original English content, IDs, choices, scores, next-node links, and progression.
- Added an automated completeness test for the four conversations.

## Verification
- `npm test`: **147/147 passed**.
- `npm run build`: **passed** (`www/ ready`).
- The test suite validates the translated fields and existing conversation graph checks continue to pass.
- `www/` production output is included.

## Review note
Somali translations are a working draft and need independent review by a native Somali-language editor. No live Supabase, physical-device, or browser E2E testing is claimed for this checkpoint.

## Remaining work
- 11 of the 21 conversation entries still need full Somali localization.
- Reading comprehension prompts/options/answers/explanations, Listening questions and answer choices, Vocabulary, Grammar, and app-wide interface localization still require work.
