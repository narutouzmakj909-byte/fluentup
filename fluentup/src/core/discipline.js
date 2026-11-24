// Challenges, schedules and achievements (deterministic).
import { addDays } from './schedule.js';
export const PRESETS = [7, 30, 90, 180, 365];
export function makeChallenge({ title, days, start }, id) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new RangeError('days must be an integer 1-3650');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new TypeError('start must be YYYY-MM-DD');
  return { id, title: title?.trim() || `${days}-day challenge`, days, start };
}
export function missedDays(ch, done, today, rest = []) {
  const end = addDays(ch.start, ch.days - 1), last = today < end ? addDays(today, -1) : end, D = new Set(done), R = new Set(rest);
  let n = 0; for (let d = ch.start; d <= last; d = addDays(d, 1)) if (!D.has(d) && !R.has(d)) n++; return n;
}
export function makeSchedule({ title, days, hour, minute, minutes = 15, vocabTarget = 5 }, id) {
  if (!days?.length || days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new RangeError('days must be 0-6');
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new RangeError('bad time');
  return { id, title: title?.trim() || 'Study session', days: [...new Set(days)].sort(), hour, minute, minutes, vocabTarget, paused: false };
}
export const isStudyDay = (s, date) => !s.paused && s.days.includes(new Date(date + 'T00:00:00Z').getUTCDay());
export const setPaused = (s, paused) => ({ ...s, paused });
export const ACHIEVEMENTS = [
  { id: 'first', title: 'First review', test: m => m.reviews >= 1 }, { id: 'streak3', title: '3-day streak', test: m => m.streak >= 3 },
  { id: 'streak7', title: '7-day streak', test: m => m.streak >= 7 }, { id: 'streak30', title: '30-day streak', test: m => m.streak >= 30 },
  { id: 'rev100', title: '100 reviews', test: m => m.reviews >= 100 }, { id: 'master10', title: '10 items mastered', test: m => m.mastered >= 10 }];
export const achievements = m => ACHIEVEMENTS.map(({ id, title, test }) => ({ id, title, earned: test(m) }));
// Challenge pause/resume. A paused day is neither done nor missed; stored as date ranges on the challenge.
export const pauseChallenge = (ch, today) => ch.pausedFrom ? ch : { ...ch, pausedFrom: today };
export function resumeChallenge(ch, today) {
  if (!ch.pausedFrom) return ch;
  const { pausedFrom, ...rest } = ch;
  return { ...rest, paused: [...(ch.paused || []), [pausedFrom, today]] };
}
export function pausedDays(ch, today) {
  const out = new Set(), add = (a, b) => { for (let d = a; d < b; d = addDays(d, 1)) out.add(d); };
  for (const [a, b] of ch.paused || []) add(a, b);
  if (ch.pausedFrom) add(ch.pausedFrom, today);
  return [...out];
}
