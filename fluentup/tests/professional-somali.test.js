import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const files = ['professional.json','professional2.json','professional3.json','professional4.json'];
const lessons = files.flatMap(file => JSON.parse(fs.readFileSync(path.join('src/data', file), 'utf8')));

test('all professional lessons have Somali titles, explanations and aligned examples', () => {
  assert.equal(lessons.length, 14);
  for (const lesson of lessons) {
    assert.ok(lesson.titleSo?.trim(), `${lesson.id}: missing titleSo`);
    assert.ok(lesson.explanationSo?.trim(), `${lesson.id}: missing explanationSo`);
    assert.equal(lesson.examplesSo?.length, lesson.examples.length, `${lesson.id}: examplesSo length mismatch`);
    lesson.examplesSo.forEach((value, i) => assert.ok(value?.trim(), `${lesson.id}: examplesSo[${i}] missing`));
  }
});

test('all professional exercise prompts and feedback have Somali support', () => {
  for (const lesson of lessons) for (const [i, q] of lesson.exercises.entries()) {
    assert.ok(q.promptSo?.trim(), `${lesson.id} exercise ${i}: missing promptSo`);
    assert.ok(q.explainSo?.trim(), `${lesson.id} exercise ${i}: missing explainSo`);
    if (q.type === 'mcq') {
      assert.equal(q.optionsSo?.length, q.options.length, `${lesson.id} exercise ${i}: optionsSo length mismatch`);
      q.optionsSo.forEach((value, j) => assert.ok(value?.trim(), `${lesson.id} exercise ${i}: optionsSo[${j}] missing`));
    }
  }
});
