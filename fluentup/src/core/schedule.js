const d = s => new Date(s + 'T00:00:00Z');
export const dayKey = dt => dt.toISOString().slice(0, 10);
export const addDays = (s, n) => dayKey(new Date(d(s).getTime() + n * 86400000));
// Streak: consecutive study days ending today (or yesterday if today not yet done). Rest days don't break it.
export function streak(done, today, rest = []) {
  const D = new Set(done), R = new Set(rest); let day = today, n = 0;
  if (!D.has(day)) day = addDays(day, -1);
  for (let i = 0; i < 4000; i++, day = addDays(day, -1)) {
    if (D.has(day)) n++; else if (!R.has(day)) break;
  }
  return n;
}
export function challengeProgress(ch, done, today) {
  const end = addDays(ch.start, ch.days - 1);
  const completed = new Set(done.filter(x => x >= ch.start && x <= end)).size;
  const elapsed = Math.min(ch.days, Math.max(0, Math.round((d(today) - d(ch.start)) / 86400000) + 1));
  return { completed, elapsed, percent: Math.round(100 * completed / ch.days), finished: today > end, end };
}
// Next fire time (local) for {hour,minute,days:[0-6 Sun..Sat], [] = daily, enabled}.
export function nextAlarm(a, now = new Date()) {
  if (!a.enabled) return null;
  for (let i = 0; i < 8; i++) {
    const t = new Date(now); t.setDate(t.getDate() + i); t.setHours(a.hour, a.minute, 0, 0);
    if (t > now && (!a.days?.length || a.days.includes(t.getDay()))) return t;
  }
  return null;
}
export const snooze = (now, minutes = 10) => new Date(now.getTime() + minutes * 60000);
