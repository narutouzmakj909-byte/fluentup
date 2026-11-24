import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson, validateConversation, begin, choose, isDone, percent, recordBest } from '../src/core/lessons.js';
import { gradeAnswer } from '../src/core/exercises.js';
const J = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8')), grammar = J('grammar'), convos = J('conversations');
test('shipped grammar content is valid, ids unique, answers grade correct and wrong answers do not', () => {
  assert.equal(new Set(grammar.map(l => l.id)).size, grammar.length);
  for (const l of grammar) { assert.deepEqual(validateLesson(l), [], l.id); for (const q of l.exercises) { assert.ok(gradeAnswer(q, q.answer), q.prompt); if (q.type === 'mcq') assert.ok(!gradeAnswer(q, (q.answer + 1) % q.options.length), q.prompt); } }
});
test('lesson validator rejects bad lessons', () => {
  assert.ok(validateLesson({}).length > 3); const l = structuredClone(grammar[0]); l.exercises[1].answer = 9; assert.deepEqual(validateLesson(l), ['exercise 1 options']);
});
test('shipped conversations valid; best path = 100%, worst path = 0%', () => {
  for (const c of convos) assert.deepEqual(validateConversation(c), [], c.id);
  const c = convos[0]; let st = begin(c); st = choose(c, st, 0); assert.equal(st.feedback, 'Polite and natural.'); st = choose(c, st, 0); assert.ok(isDone(c, st)); assert.equal(percent(st), 100);
  let w = begin(c); w = choose(c, w, 2); w = choose(c, w, 2); assert.equal(percent(w), 0); assert.throws(() => choose(c, begin(c), 5));
});
test('conversation validator catches broken graphs', () => {
  const c = structuredClone(convos[0]); c.nodes.n1.choices[0].next = 'nope'; assert.match(validateConversation(c).join(), /next/);
  const d = structuredClone(convos[0]); d.nodes.orphan = { end: true, say: 'x' }; assert.match(validateConversation(d).join(), /orphan: unreachable/);
  const l = structuredClone(convos[0]); l.nodes.n2.choices.forEach(x => x.next = 'n1'); assert.match(validateConversation(l).join(), /cannot reach an ending/);
});
test('recordBest keeps best and counts attempts', () => { let p = recordBest({}, 'a', 50, 1); p = recordBest(p, 'a', 30, 2); assert.deepEqual(p.a, { best: 50, attempts: 2, last: 2 }); });
