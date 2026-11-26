import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson } from '../src/core/lessons.js'; import { importEntries } from '../src/core/library.js'; import { gradeAnswer } from '../src/core/exercises.js';
import { suggestVocab, grammarHints, checkWriting } from '../src/core/writing.js'; import { dailyReviews, skills, mistakeTrend, studyMinutes } from '../src/core/analytics.js';
import { capabilities, wordMatch } from '../src/core/speech.js'; import { createSupabase } from '../src/core/supabase.js';
const J = f => JSON.parse(readFileSync(new URL('../src/data/' + f + '.json', import.meta.url)));
test('grammar2: 11 lessons valid, A1-C2 covered, every exercise answerable, order/correct graded', () => {
  const g = J('grammar2'); assert.equal(g.length, 11);
  for (const l of g) assert.deepEqual(validateLesson(l), [], l.id);
  const lv = new Set([...g, ...J('grammar')].map(l => l.level)); for (const x of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) assert.ok(lv.has(x), x);
  for (const l of g) for (const q of l.exercises) { assert.ok(gradeAnswer(q, q.type === 'mcq' ? q.answer : q.answer), l.id); assert.ok(!gradeAnswer(q, q.type === 'order' ? [...q.answer].reverse() : q.type === 'mcq' ? (q.answer + 1) % q.options.length : 'zzz')); }
});
test('seed2: all entries valid, no duplicates with seed, all types present, none claims trending', () => {
  const s2 = J('seed2'), r = importEntries([...J('seed'), ...s2]); assert.equal(r.rejected.length, 0, JSON.stringify(r.rejected));
  for (const t of ['phrase', 'idiom', 'phrasal_verb', 'slang', 'professional']) assert.ok(s2.some(e => e.type === t), t);
  assert.ok(!JSON.stringify(s2).toLowerCase().includes('trending')); assert.ok(s2.filter(e => e.type === 'slang').every(e => e.warning && e.register));
});
test('listening + writing content shape', () => {
  for (const l of J('listening')) { assert.ok(l.sentences.length >= 3 && l.questions.length >= 2, l.id); assert.equal(l.audio, null); for (const q of l.questions) assert.ok(gradeAnswer(q, q.answer), l.id); }
  for (const w of J('writing')) { assert.ok(w.prompt && w.minWords > 0, w.id); if (w.model) assert.ok(checkWriting(w.model, { required: w.required, maxWords: w.maxWords, formal: w.formal }).issues.every(i => i.code === 'too_short' || i.code === 'missing_word'), w.id); }
});
test('writing hints and vocab suggestions', () => {
  assert.ok(grammarHints('I am agree. He don\'t go. She goed.').length === 3); assert.deepEqual(grammarHints('Fine.'), []);
  assert.deepEqual(suggestVocab('It was a very good day').map(x => x.word).sort(), ['good', 'very']);
});
test('analytics from real histories', () => {
  const now = Date.UTC(2026, 0, 10, 12), cards = [{ state: 'mastered', history: [{ at: now, grade: 4 }, { at: now, grade: 1 }, { at: now - 86400000, grade: 5 }] }];
  const d = dailyReviews(cards, '2026-01-10', 3); assert.deepEqual(d.map(x => x.count), [0, 1, 2]); assert.equal(d[2].accuracy, 0.5);
  assert.equal(mistakeTrend(cards, '2026-01-10', 2)[1].mistakes, 1);
  const s = skills({ lp: { a: { best: 80 }, b: { best: 60 } }, lessons: [{ id: 'a', track: 'grammar' }, { id: 'b', track: 'reading' }], cards, speak: [1, 2], write: [{ passed: true }, { passed: false }] });
  assert.equal(s.grammar.avg, 80); assert.equal(s.reading.avg, 60); assert.equal(s.vocabulary.mastered, 1); assert.equal(s.speaking.attempts, 2); assert.equal(s.writing.passedFirstTry, 1);
  assert.equal(studyMinutes([{ day: '2026-01-10', ms: 120000 }], '2026-01-10', 1)[0].minutes, 2);
});
test('speech capability detection + honest word match', () => {
  assert.deepEqual(capabilities({}), { tts: false, recording: false, recognition: false, secure: true });
  assert.equal(capabilities({ speechSynthesis: {}, SpeechSynthesisUtterance: class {}, navigator: { mediaDevices: { getUserMedia() {} } }, MediaRecorder: class {} }).recording, true);
  const m = wordMatch('I like tea', 'i like coffee'); assert.equal(m.matched, 2); assert.deepEqual(m.missing, ['tea']);
});
test('supabase: unconfigured -> null; auth stores session; send requires session; cards via rpc', async () => {
  assert.equal(createSupabase({}), null);
  const calls = [], f = async (u, o) => { calls.push([u, o]); return { ok: true, json: async () => ({ access_token: 't', refresh_token: 'r', user: { id: 'u' }, expires_in: 60 }) }; }, mem = {};
  const sb = createSupabase({ url: 'https://x.supabase.co', anonKey: 'anon', fetch: f, storage: { getItem: k => mem[k] ?? null, setItem: (k, v) => mem[k] = v, removeItem: k => delete mem[k] } });
  await assert.rejects(sb.send({ kind: 'card', id: '1', payload: {} }));
  await sb.signIn('a@b.c', 'pw'); assert.ok(sb.signedIn()); assert.ok(mem['fluentup.session']);
  await sb.send({ kind: 'card', id: 'op1', payload: { id: 'w1' } }); const [u, o] = calls.at(-1);
  assert.ok(u.endsWith('/rest/v1/rpc/apply_card')); assert.equal(o.headers.Authorization, 'Bearer t'); assert.equal(JSON.parse(o.body).op_id, 'op1');
  await sb.signOut(); assert.ok(!sb.signedIn()); assert.equal(mem['fluentup.session'], undefined);
});

test('supabase: signup stores the supplied full name as Auth user metadata', async () => {
  let body, url;
  const sb = createSupabase({ url: 'https://x.supabase.co', anonKey: 'anon',
    fetch: async (u, o) => { url = u; body = JSON.parse(o.body); return { ok: true, json: async () => ({ user: { id: 'u', user_metadata: body.data } }) }; },
    storage: { getItem: () => null, setItem() {}, removeItem() {} }
  });
  await sb.signUp('learner@gmail.com', 'password123', 'Amina Noor');
  assert.ok(url.endsWith('/auth/v1/signup'));
  assert.deepEqual(body, { email: 'learner@gmail.com', password: 'password123', data: { full_name: 'Amina Noor' } });
});
test('supabase: initialize refreshes an expired persisted session and clears it if refresh fails', async () => {
  const mem = { 'fluentup.session': JSON.stringify({ access_token: 'expired', refresh_token: 'refresh-old', expires_at: Date.now() - 1000, user: { id: 'u' } }) };
  const calls = [];
  const storage = { getItem: k => mem[k] ?? null, setItem: (k,v) => mem[k] = v, removeItem: k => delete mem[k] };
  const sb = createSupabase({ url: 'https://x.supabase.co', anonKey: 'anon', storage,
    fetch: async (u,o) => { calls.push([u,o]); return { ok: true, json: async () => ({ access_token: 'fresh', refresh_token: 'refresh-new', expires_in: 3600, user: { id: 'u' } }) }; }
  });
  await sb.initialize();
  assert.equal(calls.length, 1); assert.ok(calls[0][0].includes('grant_type=refresh_token'));
  assert.equal(sb.accessToken instanceof Function, true); assert.equal(sb.signedIn(), true);
  assert.equal(JSON.parse(mem['fluentup.session']).access_token, 'fresh');
  mem['fluentup.session'] = JSON.stringify({ access_token: 'expired', refresh_token: 'bad', expires_at: Date.now() - 1000, user: { id: 'u' } });
  const stale = createSupabase({ url: 'https://x.supabase.co', anonKey: 'anon', storage,
    fetch: async () => ({ ok: false, status: 401, json: async () => ({ message: 'refresh denied' }) })
  });
  await stale.initialize(); assert.equal(stale.signedIn(), false); assert.equal(mem['fluentup.session'], undefined);
});
