// Unified search over downloaded content (entries, lessons incl. reading/professional, conversations). Prefix match on every token.
// At 3M scale entry search must run server-side (tsvector/trigram indexes in db/schema.sql); this is the offline/local path.
const toks = s => String(s ?? '').toLowerCase().split(/\W+/).filter(Boolean);
export function unifiedSearch(q, { entries = [], lessons = [], convos = [], extra = [] }, limit = 30) {
  const qs = toks(q); if (!qs.length) return [];
  const hit = text => { const t = toks(text); return qs.every(x => t.some(w => w.startsWith(x))); }, out = [];
  for (const e of entries) if (hit(`${e.en} ${e.def}`)) out.push({ kind: 'entry', id: e.id, title: e.en, sub: `${e.type} · ${e.level}` });
  for (const l of lessons) if (hit(`${l.title} ${l.explanation}`)) out.push({ kind: 'lesson', id: l.id, title: l.title, sub: `${l.track ?? 'grammar'} · ${l.level}` });
  for (const c of convos) if (hit(`${c.title} ${c.context ?? ''}`)) out.push({ kind: 'convo', id: c.id, title: c.title, sub: `conversation · ${c.level}` });
  for (const x of extra) if (hit(`${x.title} ${x.text ?? ''}`)) out.push({ kind: x.kind, id: x.id, title: x.title, sub: x.sub });
  return out.slice(0, limit);
}
export const pushRecent = (list, q, max = 5) => { const s = String(q).trim(); return s ? [s, ...list.filter(x => x !== s)].slice(0, max) : list; };
