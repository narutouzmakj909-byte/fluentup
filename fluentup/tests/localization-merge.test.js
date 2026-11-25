import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url), 'utf8'));
const all = prefix => ['','2','3','4','5'].flatMap(n => {
  try { return read(`${prefix}${n || ''}.json`); } catch { return []; }
});
const present = value => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);

test('merged vocabulary and grammar retain Somali coverage from the localization work', () => {
  const vocabulary = all('seed');
  const grammar = all('grammar');
  assert.equal(vocabulary.length, 151);
  assert.equal(vocabulary.filter(x => present(x.somali)).length, 151);
  assert.equal(grammar.length, 37);
  assert.equal(grammar.filter(x => present(x.explanationSo)).length, 37);
  assert.equal(grammar.filter(x => present(x.examplesSo)).length, 37);
  assert.equal(grammar.filter(x => present(x.formulaSo)).length, 12);
  assert.equal(grammar.filter(x => present(x.mistakesSo)).length, 34);
  const exercises = grammar.flatMap(x => x.exercises ?? []);
  assert.equal(exercises.length, 159);
  assert.ok(exercises.every(q => present(q.promptSo) && present(q.explainSo)));
  const mcq = exercises.filter(q => q.options);
  assert.ok(mcq.every(q => q.optionsSo?.length === q.options.length && q.optionsSo.every(present)));
});

test('listening Somali titles and transcript segments are valid and rendered by the app', () => {
  const lessons = all('listening');
  assert.equal(lessons.length, 20);
  assert.ok(lessons.every(x => present(x.titleSo)));
  assert.ok(lessons.every(x => Array.isArray(x.sentencesSo) && x.sentencesSo.length > 0));
  for (const lesson of lessons) {
    assert.ok(lesson.sentencesSo.length <= lesson.sentences.length, lesson.id);
    assert.ok(lesson.sentencesSo.every(x => typeof x === 'string' && x.trim()), lesson.id);
  }
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /l\.titleSo/);
  assert.match(app, /l\.sentencesSo\?\.\[i\]/);
});


test('reading comprehension prompts and answer feedback have Somali guidance', () => {
  const lessons = all('reading');
  const exercises = lessons.flatMap(x => x.exercises ?? []);
  assert.equal(lessons.length, 20);
  assert.equal(exercises.length, 61);
  assert.ok(exercises.every(q => present(q.promptSo) && present(q.explainSo)));
  const mcq = exercises.filter(q => q.options);
  assert.ok(mcq.every(q => q.optionsSo?.length === q.options.length && q.optionsSo.every(present)));
});

test('listening transcripts and all comprehension prompts have Somali support', () => {
  const lessons = all('listening');
  const sentences = lessons.flatMap(x => x.sentencesSo ?? []);
  const exercises = lessons.flatMap(x => x.questions ?? []);
  assert.equal(lessons.length, 20);
  assert.equal(sentences.length, 85);
  assert.equal(exercises.length, 58);
  assert.ok(exercises.every(q => present(q.promptSo) && present(q.explainSo)));
  const mcq = exercises.filter(q => q.options);
  assert.ok(mcq.every(q => q.optionsSo?.length === q.options.length && q.optionsSo.every(present)));
});

test('all branching conversations provide Somali dialogue, choices and feedback', () => {
  const lessons = all('conversations');
  const nodes = lessons.flatMap(x => Object.values(x.nodes ?? {}));
  const choices = nodes.flatMap(n => n.choices ?? []);
  assert.equal(lessons.length, 21);
  assert.ok(nodes.every(n => present(n.saySo)));
  assert.ok(choices.every(c => present(c.textSo) && present(c.feedbackSo)));
});
