// Learner-data backup/restore. Pure functions: build a JSON backup, validate an untrusted file, and merge it
// NON-DESTRUCTIVELY into local data (restoring never deletes or overwrites newer local progress).
export const FORMAT = 1, MAX_BYTES = 8_000_000;
export const SET_KEYS = ['days', 'saved', 'rest', 'lessonSaved'];                        // unioned
export const LOG_KEYS = ['speakLog', 'writeLog', 'timeLog', 'readHist', 'lessonMist'];   // appended, de-duplicated
export const MAP_KEYS = ['lessonProg', 'convoProg', 'listenProg'];                       // id -> best score, higher wins
export const PREF_KEYS = ['goal', 'profile', 'notif', 'theme', 'tsize', 'recent'];       // local wins; backup fills gaps
export const META_KEYS = [...SET_KEYS, ...LOG_KEYS, ...MAP_KEYS, ...PREF_KEYS];
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const num = v => typeof v === 'number' && Number.isFinite(v);
export const buildBackup = ({ cards = [], meta = {}, alarms = [], challenges = [] }, now = Date.now()) => ({
  app: 'fluentup', format: FORMAT, exportedAt: new Date(now).toISOString(),
  cards, meta: Object.fromEntries(META_KEYS.filter(k => meta[k] !== undefined).map(k => [k, meta[k]])), alarms, challenges });
export function validCard(c) {
  return isObj(c) && typeof c.id === 'string' && c.id.length <= 80 && num(c.ease) && c.ease >= 1.3 && c.ease <= 5 && num(c.interval) && c.interval >= 0
    && num(c.due) && num(c.reps) && num(c.lapses) && ['new', 'learning', 'difficult', 'mastered'].includes(c.state) && Array.isArray(c.history) && c.history.length <= 5000
    && c.history.every(h => isObj(h) && num(h.at) && Number.isInteger(h.grade) && h.grade >= 0 && h.grade <= 5);
}
// Returns { ok:true, data, skipped } or { ok:false, error }. Never throws.
export function parseBackup(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'The file is empty.' };
  if (text.length > MAX_BYTES) return { ok: false, error: 'The file is too large to be a FluentUp backup.' };
  let d; try { d = JSON.parse(text); } catch { return { ok: false, error: 'This is not valid JSON, so it cannot be a FluentUp backup.' }; }
  if (!isObj(d) || d.app !== 'fluentup') return { ok: false, error: 'This file is not a FluentUp backup.' };
  if (d.format !== FORMAT) return { ok: false, error: `Unsupported backup format (${d.format}). This app reads format ${FORMAT}.` };
  if (!Array.isArray(d.cards) || !isObj(d.meta)) return { ok: false, error: 'The backup is missing its cards or settings.' };
  const cards = d.cards.filter(validCard), meta = {};
  for (const k of META_KEYS) if (d.meta[k] !== undefined) {
    const v = d.meta[k];
    if (SET_KEYS.includes(k) || LOG_KEYS.includes(k)) { if (Array.isArray(v) && v.length <= 20000) meta[k] = v; }
    else if (MAP_KEYS.includes(k)) { if (isObj(v)) meta[k] = v; }
    else if (k === 'recent') { if (Array.isArray(v)) meta[k] = v.filter(x => typeof x === 'string').slice(0, 20); }
    else if (k === 'theme') { if (['system', 'light', 'dark'].includes(v)) meta[k] = v; }
    else if (k === 'tsize') { if (['sm', 'md', 'lg', 'xl'].includes(v)) meta[k] = v; }
    else if (isObj(v)) meta[k] = v;
  }
  const keep = a => (Array.isArray(a) ? a.filter(x => isObj(x) && typeof x.id === 'string').slice(0, 500) : []);
  return { ok: true, data: { cards, meta, alarms: keep(d.alarms), challenges: keep(d.challenges) }, skipped: d.cards.length - cards.length };
}
// Newer review activity wins; on a tie the card with more history wins. Returns the card to keep.
export const pickCard = (local, incoming) => !local ? incoming
  : (incoming.history.length > local.history.length || ((incoming.updatedAt ?? 0) > (local.updatedAt ?? 0) && incoming.history.length === local.history.length)) ? incoming : local;
export function mergeMetaValue(key, local, incoming) {
  if (SET_KEYS.includes(key)) return [...new Set([...(Array.isArray(local) ? local : []), ...incoming])];
  if (LOG_KEYS.includes(key)) { const seen = new Set(), out = []; for (const x of [...(Array.isArray(local) ? local : []), ...incoming]) { const s = JSON.stringify(x); if (!seen.has(s)) { seen.add(s); out.push(x); } } return out.slice(-500); }
  if (MAP_KEYS.includes(key)) { const out = { ...(isObj(local) ? local : {}) }; for (const [id, v] of Object.entries(incoming)) { const cur = out[id]; out[id] = num(cur) && num(v) ? Math.max(cur, v) : cur === undefined ? v : cur; } return out; }
  return local === undefined || local === null || (isObj(local) && !Object.keys(local).length) || (Array.isArray(local) && !local.length) ? incoming : local;
}
// True when the learner has real progress but no backup in the last `days` days (never nags an empty account).
export const backupDue = ({ reviews = 0, lastBackup = 0, now = Date.now(), days = 14 }) => reviews > 0 && (!lastBackup || now - lastBackup > days * 86400000);
