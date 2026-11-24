// Deterministic, rule-based writing feedback. NOT an AI evaluation: it only checks measurable surface rules.
const words = t => (t.toLowerCase().match(/[a-z']+/g) || []);
export function checkWriting(text, { minWords = 1, maxWords = Infinity, required = [], formal = false } = {}) {
  const t = String(text ?? ''), w = words(t), issues = [];
  if (w.length < minWords) issues.push({ code: 'too_short', msg: `Write at least ${minWords} words (you wrote ${w.length}).` });
  if (w.length > maxWords) issues.push({ code: 'too_long', msg: `Keep it under ${maxWords} words (you wrote ${w.length}).` });
  const trimmed = t.trim();
  if (trimmed && !/^[A-Z]/.test(trimmed)) issues.push({ code: 'capital', msg: 'Start with a capital letter.' });
  if (trimmed && !/[.!?]["')]?$/.test(trimmed)) issues.push({ code: 'end_punct', msg: 'End with . ! or ?' });
  if (/\bi\b/.test(t)) issues.push({ code: 'lower_i', msg: 'Write "I" as a capital letter.' });
  if (/\b(\w+)\s+\1\b/i.test(t)) issues.push({ code: 'repeat', msg: 'A word is repeated twice in a row.' });
  if (/ {2,}/.test(t)) issues.push({ code: 'spaces', msg: 'Remove double spaces.' });
  if (formal && /\b(gonna|wanna|gotta|u|thx|lol|can't|won't|don't)\b/i.test(t)) issues.push({ code: 'register', msg: 'Avoid contractions and informal words in formal writing.' });
  for (const r of required) if (!words(t).includes(r.toLowerCase())) issues.push({ code: 'missing_word', msg: `Use the word "${r}".` });
  return { wordCount: w.length, issues, passed: issues.length === 0, kind: 'rule-based' };
}
// Vocabulary-improvement suggestions: fixed lookup table, not a language model.
const WEAK = { good: ['excellent', 'great', 'effective'], bad: ['poor', 'terrible', 'harmful'], big: ['large', 'huge', 'significant'], very: ['(use a stronger adjective instead)'], thing: ['(name the thing specifically)'], nice: ['pleasant', 'enjoyable', 'kind'], get: ['obtain', 'receive', 'become'], said: ['explained', 'stated', 'replied'] };
export function suggestVocab(text) { const w = new Set(words(text)); return Object.keys(WEAK).filter(k => w.has(k)).map(k => ({ word: k, try: WEAK[k] })); }
// Common learner-error patterns (fixed rules; catches only these exact patterns).
const GRAM = [[/\bI am agree\b/i, 'Say "I agree" (agree is a verb).'], [/\bmore (better|bigger|taller|faster|easier)\b/i, 'Do not use "more" with -er comparatives.'],
  [/\b(he|she|it) (don't|have|are)\b/i, 'Check subject-verb agreement: he/she/it takes does/has/is.'], [/\bdidn't (went|saw|came|took|ate)\b/i, 'After didn\'t use the base verb.'],
  [/\b(childs|mans|foots|womans)\b/i, 'Irregular plural: children, men, feet, women.'], [/\bI have \d+ years\b/i, 'Say "I am 20 years old".'], [/\bgoed\b|\bbuyed\b|\beated\b/i, 'Irregular past: went, bought, ate.']];
export const grammarHints = text => GRAM.filter(([r]) => r.test(text)).map(([, m]) => m);
