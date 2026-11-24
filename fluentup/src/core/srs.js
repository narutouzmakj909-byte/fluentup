// Deterministic spaced repetition (SM-2 variant). Grades: 0-5 (<3 = lapse).
export const DAY = 86400000, MIN = 60000;
export const newCard = (id, now = Date.now()) =>
  ({ id, state: 'new', ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, history: [] });
export function review(card, grade, now = Date.now()) {
  if (!Number.isInteger(grade) || grade < 0 || grade > 5) throw new RangeError('grade must be integer 0-5');
  const c = { ...card, history: [...card.history, { at: now, grade }] };
  // Early, successful practice (e.g. from the quiz) is logged but must not stretch the schedule.
  if (grade >= 3 && card.state !== 'new' && now < card.due) return c;
  if (grade < 3) {
    c.reps = 0; c.lapses = card.lapses + 1; c.interval = 0; c.due = now + 10 * MIN;
    c.state = c.lapses >= 3 ? 'difficult' : 'learning';
  } else {
    c.reps = card.reps + 1;
    c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.max(1, Math.round(card.interval * card.ease));
    c.due = now + c.interval * DAY;
    c.state = c.interval >= 21 ? 'mastered' : 'learning';
  }
  const q = 5 - grade;
  c.ease = Math.max(1.3, +(card.ease + 0.1 - q * (0.08 + q * 0.02)).toFixed(4));
  return c;
}
export const dueCards = (cards, now = Date.now()) => cards.filter(c => c.due <= now).sort((a, b) => a.due - b.due);
export const stats = (cards, now = Date.now()) => ({
  new: cards.filter(c => c.state === 'new').length,
  learning: cards.filter(c => c.state === 'learning').length,
  difficult: cards.filter(c => c.state === 'difficult').length,
  mastered: cards.filter(c => c.state === 'mastered').length,
  due: dueCards(cards, now).length });
