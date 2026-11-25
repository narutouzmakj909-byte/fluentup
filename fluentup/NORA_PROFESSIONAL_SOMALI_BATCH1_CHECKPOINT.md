# NORA Somali Localization Checkpoint — Professional English Batch 1

Date: 25 November 2026  
Project: NORA / FluentUp v0.9.0

## Scope completed
- Localized all 14 Professional English lessons across `professional.json` through `professional4.json`.
- Added Somali lesson titles and full Somali explanations for all 14 lessons.
- Added Somali translations for all 44 examples.
- Added Somali prompts and feedback explanations for all 42 exercises.
- Added aligned Somali option labels for all 34 multiple-choice exercises while preserving the original English options and answer keys.
- Updated the lesson screen to render `explanationSo` in Somali; existing renderer support displays `titleSo`, `examplesSo`, `promptSo`, `optionsSo`, and `explainSo`.
- Preserved lesson IDs, English learning content, answer keys, scoring logic, progression, and design.
- Added automated completeness tests for Professional Somali fields.

## Verification
- `npm test`: **145/145 passed**.
- `npm run build`: **passed** (`www/ ready`).
- Data audit: 14/14 titles, 14/14 explanations, 44/44 examples, 42/42 exercise prompts, 42/42 feedback explanations, and 34/34 MCQ option sets have Somali support.

## Review note
Somali translations are carefully drafted but remain unverified by a native-language editor. Existing English source text and English answer keys are retained for language-learning accuracy.

## Remaining work
- Reading comprehension questions/answers and further consistency review.
- 19 remaining conversations need Somali dialogue and branching-choice localization.
- Vocabulary, grammar, listening, and app-wide interface localization audit.
- Full browser/device and backend verification still required.
