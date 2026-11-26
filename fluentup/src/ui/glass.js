// NORA Liquid Glass component kit. Pure string builders (work in the fake-DOM tests) plus guarded runtime behaviours.
export const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const P = {
  back: 'm15 18-6-6 6-6', search: 'm21 21-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  close: 'M18 6 6 18M6 6l12 12', eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zm10 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  'eye-off': 'm3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.2 3.8M6.2 6.2C3.6 8 2 12 2 12s3.6 7 10 7c1 0 1.9-.2 2.8-.5', play: 'M7 4.5v15l12-7.5z', stop: 'M6 6h12v12H6z', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v3', speaker: 'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', check: 'm5 12.5 4.5 4.5L19 7.5', plus: 'M12 5v14M5 12h14', bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.3 21a1.9 1.9 0 0 0 3.4 0', flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z',
  next: 'm9 18 6-6-6-6', arrow: 'M5 12h14M13 6l6 6-6 6', retry: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7', ear: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z', pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', cal: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2', cards: 'M7 7h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM4 16V5a1 1 0 0 1 1-1h11', chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z', trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6', sparkle: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
};
export const icon = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[k] ?? ''}"/></svg>`;
export const iconFill = k => `<svg class="ic" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="${P[k] ?? ''}"/></svg>`;
const a = x => x ? ' ' + x : '';
// Buttons: variant '' (glass), 'p' (primary tint), 'ghost', 'danger'. Text buttons are pills; icon buttons are circles.
export const LiquidGlassButton = ({ label, attrs = '', variant = '', icon: ic = '', block = false }) => `<button class="${[variant, block ? 'block' : ''].filter(Boolean).join(' ')}"${a(attrs)}>${ic ? icon(ic) : ''}${label}</button>`;
export const LiquidGlassIconButton = ({ icon: ic, label, attrs = '', variant = '', size = '' }) => `<button class="ib ${variant} ${size}"${a(attrs)} aria-label="${esc(label)}">${icon(ic)}</button>`;
export const LiquidGlassCard = (inner, { cls = '', attrs = '' } = {}) => `<div class="card${a(cls)}"${a(attrs)}>${inner}</div>`;
export const LiquidGlassChip = (label, { attrs = '', on } = {}) => `<button class="chipb"${a(attrs)}${on === undefined ? '' : ` aria-pressed="${on}"`}>${label}</button>`;
export const LiquidGlassTab = (items, cur, key) => `<div class="row seg" role="tablist">${items.map(([v, t]) => `<button role="tab" ${key}="${v}" aria-pressed="${cur === v}" aria-selected="${cur === v}">${t}</button>`).join('')}</div>`;
export const LiquidGlassProgress = (p, label = 'Progress') => `<div class="progress" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><div style="width:${p}%"></div></div>`;
export const LiquidGlassToggle = ({ id, label, on, attrs = '' }) => `<label class="tog" for="${id}"><span>${label}</span><input id="${id}" type="checkbox" role="switch" ${on ? 'checked' : ''}${a(attrs)}><i aria-hidden="true"></i></label>`;
export const LiquidGlassInput = ({ id, label, type = 'text', value = '', ph = '', attrs = '', search = false }) => `<label class="fld" for="${id}">${search ? icon('search') : ''}<span class="sr">${esc(label)}</span><input id="${id}" type="${type}" aria-label="${esc(label)}" placeholder="${esc(ph)}" value="${esc(value)}"${a(attrs)}></label>`;
export const LiquidGlassSheet = ({ title, body, actions = '' }) => `<div class="scrim" data-sheet-close="1"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><i class="grab" aria-hidden="true"></i><h2>${esc(title)}</h2><div class="sheet-b">${body}</div><div class="row sheet-a">${actions}</div></div>`;
export const LiquidGlassModal = o => LiquidGlassSheet(o).replace('class="sheet"', 'class="sheet modal"');
// ---- runtime (all guarded: tests run with a fake DOM) ----
const dom = () => typeof document !== 'undefined' && document.documentElement?.classList ? document : null;
export function setNav(tab, order) { const d = dom(); if (!d) return; const i = Math.max(0, order.indexOf(tab)); d.querySelector('nav')?.style?.setProperty('--i', i); }
export function enter(el) { if (!el?.classList) return; el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
export function initGlass() {
  const d = dom(); if (!d || d.documentElement.dataset.glass) return; d.documentElement.dataset.glass = '1';
  const track = e => { const b = e.target.closest?.('button,.card.item,label.chip'); if (!b) return; const r = b.getBoundingClientRect(); b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); b.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); };
  d.addEventListener('pointerdown', track, { passive: true }); d.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') track(e); }, { passive: true });
  const sc = () => d.documentElement.classList.toggle('scrolled', scrollY > 8); addEventListener('scroll', sc, { passive: true }); sc();
}
let lastFocus = null;
export function openSheet(o) { const d = dom(); if (!d) return Promise.resolve(null); closeSheet(); lastFocus = d.activeElement; const host = d.createElement('div'); host.id = 'sheet-host'; host.innerHTML = (o.modal ? LiquidGlassModal : LiquidGlassSheet)(o); d.body.appendChild(host);
  return new Promise(res => { host.onclick = e => { const t = e.target.closest?.('[data-sheet-close],[data-sheet-act]'); if (t) { closeSheet(); res(t.dataset.sheetAct ?? null); } }; host.onkeydown = e => { if (e.key === 'Escape') { closeSheet(); res(null); } if (e.key === 'Tab') { const f = [...host.querySelectorAll('button,input,select,textarea')].filter(x => !x.disabled); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); } } }; (host.querySelector('[data-sheet-act]') ?? host.querySelector('.sheet'))?.focus?.(); }); }
export function closeSheet() { const d = dom(); const h = d?.getElementById('sheet-host'); if (h?.remove) { h.remove(); lastFocus?.focus?.(); } }
export async function confirmSheet({ title, body, yes = 'Delete', no = 'Cancel' }) { if (!dom()) return true; return (await openSheet({ modal: true, title, body: `<p class="mut">${esc(body)}</p>`, actions: `<button data-sheet-act="no">${no}</button><button class="p danger" data-sheet-act="yes">${yes}</button>` })) === 'yes'; }
