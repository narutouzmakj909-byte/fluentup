// Analytics computed only from stored data (card histories, progress maps, session logs).
import { addDays } from './schedule.js';
const dk = t => new Date(t).toISOString().slice(0, 10);
export function dailyReviews(cards, today, n = 7) {
  const m = {}; for (const c of cards) for (const h of c.history ?? []) { const d = dk(h.at); (m[d] ??= { count: 0, right: 0 }); m[d].count++; if (h.grade >= 3) m[d].right++; }
  return Array.from({ length: n }, (_, i) => { const date = addDays(today, i - n + 1), v = m[date] ?? { count: 0, right: 0 }; return { date, count: v.count, accuracy: v.count ? v.right / v.count : null }; });
}
const avg = o => { const v = Object.values(o ?? {}).map(x => x.best); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
export function skills({ lp = {}, cp = {}, listen = {}, speak = [], write = [], cards = [], lessons = [] }) {
  const byTrack = t => Object.fromEntries(Object.entries(lp).filter(([id]) => (lessons.find(l => l.id === id)?.track ?? 'grammar') === t));
  const all = cards.flatMap(c => c.history ?? []);
  return { vocabulary: { reviews: all.length, accuracy: all.length ? Math.round(100 * all.filter(h => h.grade >= 3).length / all.length) : null, mastered: cards.filter(c => c.state === 'mastered').length },
    grammar: { lessons: Object.keys(byTrack('grammar')).length, avg: avg(byTrack('grammar')) }, reading: { lessons: Object.keys(byTrack('reading')).length, avg: avg(byTrack('reading')) },
    professional: { lessons: Object.keys(byTrack('professional')).length, avg: avg(byTrack('professional')) }, conversation: { played: Object.keys(cp).length, avg: avg(cp) },
    listening: { done: Object.keys(listen).length, avg: avg(listen) }, speaking: { attempts: speak.length }, writing: { submissions: write.length, passedFirstTry: write.filter(w => w.passed).length } };
}
export const mistakeTrend = (cards, today, n = 7) => { const m = {}; for (const c of cards) for (const h of c.history ?? []) if (h.grade < 3) m[dk(h.at)] = (m[dk(h.at)] ?? 0) + 1;
  return Array.from({ length: n }, (_, i) => { const d = addDays(today, i - n + 1); return { date: d, mistakes: m[d] ?? 0 }; }); };
export const studyMinutes = (log, today, n = 7) => Array.from({ length: n }, (_, i) => { const d = addDays(today, i - n + 1); return { date: d, minutes: Math.round((log ?? []).filter(s => s.day === d).reduce((a, s) => a + s.ms, 0) / 60000) }; });

// Monthly statistics from stored data only. months = number of calendar months ending with the month of `today` (YYYY-MM-DD).
export function monthly(cards, tlog, days, today, months = 6) {
  const [y, m] = today.split('-').map(Number), keys = Array.from({ length: months }, (_, i) => { const d = new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1)); return d.toISOString().slice(0, 7); });
  const out = Object.fromEntries(keys.map(k => [k, { month: k, reviews: 0, correct: 0, mistakes: 0, minutes: 0, studyDays: 0, accuracy: null }]));
  for (const c of cards) for (const h of c.history ?? []) { const r = out[dk(h.at).slice(0, 7)]; if (r) { r.reviews++; h.grade >= 3 ? r.correct++ : r.mistakes++; } }
  for (const t of tlog ?? []) { const r = out[t.day?.slice(0, 7)]; if (r) r.minutes += t.ms / 60000; }
  for (const d of new Set(days ?? [])) { const r = out[d.slice(0, 7)]; if (r) r.studyDays++; }
  return keys.map(k => { const r = out[k]; return { ...r, minutes: Math.round(r.minutes), accuracy: r.reviews ? Math.round(100 * r.correct / r.reviews) : null }; });
}
// Weekly summary for the last `weeks` weeks (7-day buckets ending today), plus change versus the previous bucket.
export function weekly(cards, tlog, days, today, weeks = 4) {
  const rows = Array.from({ length: weeks }, (_, w) => { const end = addDays(today, -7 * (weeks - 1 - w)), start = addDays(end, -6); const inR = d => d >= start && d <= end;
    const hs = cards.flatMap(c => c.history ?? []).filter(h => inR(dk(h.at))); const ok = hs.filter(h => h.grade >= 3).length;
    return { start, end, reviews: hs.length, accuracy: hs.length ? Math.round(100 * ok / hs.length) : null, minutes: Math.round((tlog ?? []).filter(t => inR(t.day)).reduce((a, t) => a + t.ms, 0) / 60000), studyDays: new Set((days ?? []).filter(inR)).size }; });
  return rows.map((r, i) => ({ ...r, trend: i && rows[i - 1].reviews ? Math.round(100 * (r.reviews - rows[i - 1].reviews) / rows[i - 1].reviews) : null }));
}
// Longest streak ever from study days (rest days bridge gaps).
export function streakHistory(days, rest = []) { const set = new Set([...(days ?? []), ...(rest ?? [])]); let best = 0, cur = 0, prev = null;
  for (const d of [...set].sort()) { cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; if ((days ?? []).includes(d) || cur) best = Math.max(best, cur); prev = d; } return best; }
