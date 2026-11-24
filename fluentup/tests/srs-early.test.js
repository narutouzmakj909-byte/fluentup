import test from 'node:test'; import assert from 'node:assert/strict';
import { newCard, review, DAY } from '../src/core/srs.js';
test('early correct practice is logged but does not advance interval, ease or due date', () => {
  const t0 = 1e12; let c = review(newCard('a', t0), 4, t0); assert.equal(c.interval, 1);
  const early = review(c, 5, t0 + 1000);
  assert.equal(early.interval, 1); assert.equal(early.reps, c.reps); assert.equal(early.ease, c.ease); assert.equal(early.due, c.due); assert.equal(early.history.length, 2);
});
test('early mistakes still count as lapses, and due cards advance normally', () => {
  const t0 = 1e12; let c = review(newCard('a', t0), 4, t0);
  assert.equal(review(c, 1, t0 + 1000).lapses, 1);
  const next = review(c, 4, t0 + DAY); assert.equal(next.interval, 3);
});
test('new cards are scheduled on their first correct answer', () => {
  const t0 = 1e12, c = review(newCard('a', t0 + 5000), 5, t0); assert.equal(c.interval, 1); assert.equal(c.state, 'learning');
});
