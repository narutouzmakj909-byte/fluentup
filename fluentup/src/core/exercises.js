const norm = s => String(s).trim().toLowerCase().replace(/[.,!?;:]+$/g, '').replace(/\s+/g, ' ');
export function gradeAnswer(q, a) {
  switch (q.type) {
    case 'mcq': return a === q.answer;
    case 'fill': case 'translate': case 'correct': return [q.answer, ...(q.accept || [])].some(x => norm(x) === norm(a));
    case 'order': return Array.isArray(a) && norm(a.join(' ')) === norm(q.answer.join(' '));
    case 'match': return q.pairs.every(([l, r]) => a && a[l] === r) && Object.keys(a || {}).length === q.pairs.length;
    default: throw new Error('unknown question type: ' + q.type);
  }
}
export function scoreSession(results) {
  const total = results.length, correct = results.filter(r => r.correct).length;
  return { total, correct, incorrect: total - correct, accuracy: total ? correct / total : 0,
    reviewList: results.filter(r => !r.correct).map(r => r.id) };
}
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
// Deterministic difficulty rule: last 5 answers >=90% -> up, <=50% -> down.
export function nextLevel(level, recent) {
  const i = LEVELS.indexOf(level); if (i < 0) throw new Error('bad level');
  const w = recent.slice(-5); if (w.length < 5) return level;
  const acc = w.filter(Boolean).length / 5;
  return LEVELS[Math.min(5, Math.max(0, i + (acc >= 0.9 ? 1 : acc <= 0.5 ? -1 : 0)))];
}
// Sentence correction: accepts any listed corrected form (case/punctuation-insensitive).
export const gradeCorrection = (q, a) => [q.answer, ...(q.accept || [])].some(x => norm(x) === norm(a));
