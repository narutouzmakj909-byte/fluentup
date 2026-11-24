import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validateLesson } from '../src/core/lessons.js';
test('app.js spreads every grammar file so grammar3 lessons reach the app', () => {
  const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(src, /\.\.\.await load\('grammar3'\)/);
  assert.doesNotMatch(src, /[^.]await load\('grammar3'\)/);
});
test('grammar3.json lessons all validate', () => {
  const l = JSON.parse(readFileSync(new URL('../src/data/grammar3.json', import.meta.url), 'utf8'));
  assert.equal(l.length, 11); for (const x of l) assert.deepEqual(validateLesson(x), []);
});
test('boot applies the saved theme and text size before the first render', () => {
  const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(src, /applyTheme\(\); arm\(\); render\(\);\s*$/);
  assert.match(src, /dataset\.size = S\.tsize/);
});
