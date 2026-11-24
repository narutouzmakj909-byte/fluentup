// Content pipeline: validate + dedupe + index. The full library lives server-side; this runs at import time.
import { LEVELS } from './exercises.js';
const TYPES = ['word','phrase','idiom','phrasal_verb','slang','pattern','collocation','sentence','professional'];
export function validateEntry(e) {
  const errs = [];
  if (!e.id) errs.push('id'); if (!e.en?.trim()) errs.push('en'); if (!e.def?.trim()) errs.push('def');
  if (!TYPES.includes(e.type)) errs.push('type'); if (!LEVELS.includes(e.level)) errs.push('level');
  if (!Array.isArray(e.ex) || !e.ex.length) errs.push('ex');
  return errs;
}
export function importEntries(list) {
  const seen = new Set(), ok = [], rejected = [];
  for (const e of list) {
    const errs = validateEntry(e), key = `${e.type}|${e.en?.trim().toLowerCase()}`;
    if (errs.length) rejected.push({ id: e.id, reason: 'invalid: ' + errs.join(',') });
    else if (seen.has(key)) rejected.push({ id: e.id, reason: 'duplicate' });
    else { seen.add(key); ok.push(e); }
  }
  return { ok, rejected };
}
const toks = s => s.toLowerCase().split(/\W+/).filter(Boolean);
export const buildIndex = list => { const m = new Map(); for (const e of list) for (const t of toks(e.en)) (m.get(t) ?? m.set(t, []).get(t)).push(e.id); return m; };
export function search(idx, byId, q, { limit = 20, offset = 0 } = {}) {
  let ids = null;
  for (const t of toks(q)) {
    const hit = new Set([...idx.keys()].filter(k => k.startsWith(t)).flatMap(k => idx.get(k)));
    ids = ids ? new Set([...ids].filter(x => hit.has(x))) : hit;
  }
  return ids ? [...ids].slice(offset, offset + limit).map(i => byId.get(i)) : [];
}
// Browse = filter + paginate an already-searched pool. At scale this maps to keyset-paginated SQL (see entries_browse index).
export function browse(pool, { type = '', level = '', only = null, page = 1, pageSize = 20 } = {}) {
  const f = pool.filter(e => (!type || e.type === type) && (!level || e.level === level) && (!only || only.has(e.id)));
  const pages = Math.max(1, Math.ceil(f.length / pageSize)), p = Math.min(Math.max(1, page), pages);
  return { items: f.slice((p - 1) * pageSize, p * pageSize), total: f.length, page: p, pages };
}
export const toggle = (list, id) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
