// Grammar lesson + conversation validation/engines, plus progress recording. Deterministic; no AI.
import { LEVELS } from './exercises.js';
export function validateLesson(l) {
  const e = [];
  if (!l?.id) e.push('id'); if (!l?.title) e.push('title'); if (!LEVELS.includes(l?.level)) e.push('level');
  if (l?.track && !['grammar', 'reading', 'professional'].includes(l.track)) e.push('track');
  if (typeof l?.explanation !== 'string' || !l.explanation) e.push('explanation');
  if (!Array.isArray(l?.examples) || !l.examples.length) e.push('examples');
  if (!Array.isArray(l?.exercises) || !l.exercises.length) e.push('exercises');
  else l.exercises.forEach((x, i) => {
    if (!['mcq', 'fill', 'correct', 'order'].includes(x?.type) || !x.prompt || x.answer === undefined) e.push(`exercise ${i}`);
    else if (x.type === 'order' && (!Array.isArray(x.words) || !Array.isArray(x.answer) || [...x.words].sort().join('|') !== [...x.answer].sort().join('|'))) e.push(`exercise ${i} order`);
    else if (x.type === 'mcq' && (!Array.isArray(x.options) || !Number.isInteger(x.answer) || x.answer < 0 || x.answer >= x.options.length)) e.push(`exercise ${i} options`);
  });
  return e;
}
export function validateConversation(c) {
  const e = [], N = c?.nodes;
  if (!c?.id) e.push('id'); if (!c?.title) e.push('title'); if (!LEVELS.includes(c?.level)) e.push('level');
  if (!N || typeof N !== 'object' || !N[c.start]) { e.push('start'); return e; }
  for (const [k, n] of Object.entries(N)) {
    if (!n.say) e.push(`${k}: say`);
    if (n.end) { if (n.choices) e.push(`${k}: end node has choices`); }
    else if (!Array.isArray(n.choices) || n.choices.length < 2) e.push(`${k}: needs 2+ choices`);
    else n.choices.forEach((ch, i) => { if (!ch.text) e.push(`${k}.${i}: text`); if (![0, 1, 2].includes(ch.score)) e.push(`${k}.${i}: score`); if (!N[ch.next]) e.push(`${k}.${i}: next`); });
  }
  if (e.length) return e;
  const seen = new Set([c.start]), st = [c.start];
  while (st.length) for (const ch of N[st.pop()].choices ?? []) if (!seen.has(ch.next)) { seen.add(ch.next); st.push(ch.next); }
  for (const k of Object.keys(N)) if (!seen.has(k)) e.push(`${k}: unreachable`);
  const ends = new Set(Object.keys(N).filter(k => N[k].end)); let grew = true;
  while (grew) { grew = false; for (const [k, n] of Object.entries(N)) if (!ends.has(k) && n.choices?.some(x => ends.has(x.next))) { ends.add(k); grew = true; } }
  for (const k of Object.keys(N)) if (!ends.has(k)) e.push(`${k}: cannot reach an ending`);
  return e;
}
export const begin = c => ({ id: c.id, node: c.start, score: 0, max: 0, path: [], feedback: null });
export function choose(c, st, i) {
  const n = c.nodes[st.node], ch = n.choices?.[i]; if (!ch) throw new RangeError('no such choice');
  return { ...st, node: ch.next, score: st.score + ch.score, max: st.max + Math.max(...n.choices.map(x => x.score)), path: [...st.path, { node: st.node, choice: i }], feedback: ch.feedback ?? null };
}
export const isDone = (c, st) => !!c.nodes[st.node].end;
export const percent = st => st.max ? Math.round(100 * st.score / st.max) : 0;
export const recordBest = (prog, id, pct, now = Date.now()) => ({ ...prog, [id]: { best: Math.max(prog[id]?.best ?? 0, pct), attempts: (prog[id]?.attempts ?? 0) + 1, last: now } });
