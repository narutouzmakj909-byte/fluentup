// Content import: JSONL -> validated entries + Postgres COPY-ready CSV + rejection report.
import { importEntries } from './library.js';
export function parseJsonl(text) {
  const entries = [], errors = [];
  text.split(/\r?\n/).forEach((l, i) => { if (!l.trim()) return; try { entries.push(JSON.parse(l)); } catch { errors.push({ id: `line ${i + 1}`, reason: 'invalid JSON' }); } });
  return { entries, errors };
}
export const CSV_COLS = ['id', 'type', 'en', 'def', 'somali', 'examples', 'ipa', 'level', 'freq_rank', 'category', 'region', 'register', 'status'];
const q = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`; // unquoted empty = NULL in COPY CSV
export const entriesToCsv = list => list.map(e => CSV_COLS.map(c => q(c === 'examples' ? JSON.stringify(e.ex) : c === 'status' ? (e.status ?? 'unverified') : e[c])).join(',')).join('\n') + (list.length ? '\n' : '');
export function prepareImport(text) {
  const { entries, errors } = parseJsonl(text), { ok, rejected } = importEntries(entries);
  return { ok, rejected: [...errors, ...rejected], csv: entriesToCsv(ok) };
}
