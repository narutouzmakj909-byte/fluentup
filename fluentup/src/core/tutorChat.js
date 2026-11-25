// Pure chat logic for the AI Tutor screen: message model, context building, stored-history hygiene, and a safe reply renderer.
import { LIMITS } from './tutor.js';
export const TUTOR = { maxChars: LIMITS.user, maxContext: LIMITS.messages, maxStored: 200, storedChars: 6000 };
export const histKey = uid => `tutorChat:${uid || 'local'}`; // one local history per signed-in account
export const SOMALI_MODES = [['high', 'Soomaali badan'], ['medium', 'Isku dhex'], ['low', 'English badan']];
export const QUICK = [
  { label: 'Af-Soomaali igu sharax', text: 'Af-Soomaali igu sharax: ' },
  { label: 'English kaliya ila hadal', text: 'English kaliya ila hadal.' },
  { label: 'Grammar-kayga sax', text: 'Grammar-kayga sax: ' },
  { label: 'Eraygan ii sharax', text: 'Eraygan ii sharax: ' },
  { label: 'I sii quiz', text: 'I sii quiz.' },
  { label: 'Ila practice garee', text: 'Ila practice garee.' },
  { label: 'Maxaa jumladan ka qaldan?', text: 'Maxaa jumladan ka qaldan? ' },
  { label: 'Ii sharax tense-kan', text: 'Ii sharax tense-kan: ' },
];
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const uid = () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
// status: 'pending' (request in flight) | 'sent' (answered) | 'failed' (not answered, error = {code, message}); assistant messages have no status.
export const newMsg = (role, content, extra = {}) => ({ id: uid(), role, content: String(content), at: Date.now(), ...extra });
export const trimHistory = (h, max = TUTOR.maxStored) => h.slice(-max);
// Make stored data safe to render and send even if it was corrupted or edited by hand. A request that was in flight when the app closed becomes a failed one.
export function sanitizeStored(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object' || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim()) continue;
    const o = { id: typeof m.id === 'string' && m.id ? m.id : uid(), role: m.role, content: m.content.slice(0, TUTOR.storedChars), at: Number.isFinite(m.at) ? m.at : 0 };
    if (m.role === 'user') {
      o.status = m.status === 'failed' ? 'failed' : m.status === 'pending' ? 'failed' : 'sent';
      if (o.status === 'failed') o.error = m.status === 'pending' || !m.error || typeof m.error !== 'object' ? { code: 'interrupted', message: '' } : { code: String(m.error.code ?? 'unavailable'), message: String(m.error.message ?? '') };
    } else if (m.truncated === true) o.truncated = true;
    out.push(o);
  }
  return trimHistory(out);
}
// The messages sent to the tutor: history up to and including `uptoId`, keeping answered exchanges and the target message, newest 20, starting with a user turn.
export function buildContext(history, uptoId) {
  const target = uptoId ?? history.at(-1)?.id, i = history.findIndex(m => m.id === target), upto = i < 0 ? history : history.slice(0, i + 1);
  const msgs = upto.filter(m => m.role === 'assistant' || m.id === target || m.status === 'sent').slice(-TUTOR.maxContext)
    .map(m => ({ role: m.role, content: m.content.slice(0, m.role === 'user' ? LIMITS.user : LIMITS.assistant) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}
// Safe, minimal Markdown: paragraphs, line breaks, - / * / 1. lists, #-headings (as bold), **bold** and `code`. Everything is HTML-escaped FIRST.
export function renderReply(text) {
  const inline = s => esc(s).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
  const out = []; let para = [], list = null;
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}${list.t === 'ol' && list.start > 1 ? ` start="${list.start}"` : ''}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.t}>`); list = null; } };
  for (const line of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line), ol = /^\s*(\d{1,3})[.)]\s+(.*)$/.exec(line), h = /^\s{0,3}#{1,4}\s+(.*)$/.exec(line);
    if (!line.trim()) { flushP(); flushL(); }
    else if (ul) { flushP(); if (list?.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(ul[1]); }
    else if (ol) { flushP(); if (list?.t !== 'ol') { flushL(); list = { t: 'ol', items: [], start: +ol[1] }; } list.items.push(ol[2]); }
    else if (h) { flushP(); flushL(); out.push(`<p><strong>${inline(h[1])}</strong></p>`); }
    else { flushL(); para.push(line); }
  }
  flushP(); flushL(); return out.join('');
}
