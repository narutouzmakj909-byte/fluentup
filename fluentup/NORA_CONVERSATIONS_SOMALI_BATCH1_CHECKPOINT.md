# NORA Somali Localization Checkpoint — Conversations Batch 1

Date: 25 November 2026
Project: NORA / FluentUp v0.9.0

## Scope completed
- Added Somali title, scenario context, dialogue lines, answer choices, and choice feedback for the two A1 conversations `c-x5-greet` and `c-x5-cafe`.
- Updated the conversation list and live conversation screen to display Somali support text while preserving the original English learning content and branching/scoring behavior.
- Added an automated localization completeness test for these two scenarios.
- Preserved all existing conversation IDs, paths, scores, English text, and app design.

## Verification
- `npm test`: **143/143 passed**.
- `npm run build`: **passed** (`www/ ready`).
- ZIP integrity: to be verified after archive creation.

## Remaining work
- 19 other conversations still need localization review and translation.
- Somali translations are draft content and need review by a fluent/native Somali editor.
- This checkpoint does not claim all conversation content or the whole app is localized.
