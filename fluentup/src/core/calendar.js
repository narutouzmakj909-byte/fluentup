// Month grid for the study calendar. month is 0-11; weeks start on Sunday; dates are YYYY-MM-DD (UTC, as in schedule.js).
export function monthGrid(year, month, { done = [], rest = [], today, since = null }) {
  const D = new Set(done), R = new Set(rest), first = new Date(Date.UTC(year, month, 1)), prefix = first.toISOString().slice(0, 8);
  const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), cells = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= dim; day++) {
    const date = prefix + String(day).padStart(2, '0');
    const state = D.has(date) ? 'done' : R.has(date) ? 'rest' : date > today ? 'future' : date === today ? 'today' : since && date >= since ? 'missed' : 'none';
    cells.push({ date, day, state });
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}
