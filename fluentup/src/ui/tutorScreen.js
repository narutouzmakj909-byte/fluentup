// NORA AI Tutor screen: a controller with injected dependencies (so it is testable without a browser) that renders the chat UI as HTML strings
// and handles its events. History is stored locally per account through the existing Repo (setMeta = device-only, never queued for sync).
import { esc, icon, confirmSheet } from './glass.js';
import { LEVELS } from '../core/exercises.js';
import { newMsg, buildContext, renderReply, sanitizeStored, trimHistory, histKey, TUTOR, QUICK, SOMALI_MODES } from '../core/tutorChat.js';
import { tutorMessage, retryable } from '../core/tutor.js';

export function createTutorScreen({ repo, ask, configured, user, signedIn, online = () => true, rerender = () => {}, defaultLevel = () => 'A1', confirm = confirmSheet }) {
  const st = { uid: undefined, loading: false, msgs: [], draft: '', busy: false, err: '', gen: 0, ctl: null, level: 'A1', somali: 'high', focus: null };
  const dom = () => (typeof document !== 'undefined' && document.getElementById ? document : null);
  const curUid = () => (signedIn() ? user()?.id ?? null : null);
  const lastUserId = () => [...st.msgs].reverse().find(m => m.role === 'user')?.id;

  const persist = async () => { const uid = st.uid; if (!uid) return; try { await repo.setMeta(histKey(uid), trimHistory(st.msgs)); } catch { st.err = 'Could not save this chat on the device. (Lama keydin karo.)'; } };
  const savePrefs = () => repo.setMeta('tutorPrefs', { level: st.level, somali: st.somali }).catch(() => {});

  const bubble = m => {
    if (m.role === 'assistant') return `<div class="tm a" data-mid="${esc(m.id)}"><span class="tav sm" aria-hidden="true">${icon('sparkle')}</span><div class="tb"><span class="sr">Tutor: </span>${renderReply(m.content)}${m.truncated && m.id === [...st.msgs].reverse().find(x => x.role === 'assistant')?.id && !st.busy ? '<div class="tcont"><button class="chipb" data-tcont="1">Sii wad · Continue</button></div>' : ''}</div></div>`;
    const failed = m.status === 'failed', e = m.error ?? {}, can = failed && retryable(e.code) && !st.busy;
    return `<div class="tm u${failed ? ' bad' : ''}" data-mid="${esc(m.id)}"><div class="tb"><span class="sr">You: </span>${esc(m.content)}</div>${failed ? `<div class="terr" role="alert"><span>${esc(e.message || tutorMessage(e.code === 'interrupted' ? 'unavailable' : e.code))}</span>${can ? `<button class="sm-b" data-tretry="${esc(m.id)}">${icon('retry')}Retry · Mar kale</button>` : ''}${e.code === 'auth' ? '<button class="sm-b" data-t="me">Account</button>' : ''}</div>` : ''}</div>`;
  };
  const welcome = () => `<div class="twelcome"><span class="tav lg" aria-hidden="true">${icon('sparkle')}</span><h2>Ku soo dhawow NORA Tutor</h2>
    <p class="mut">Weydii wax kasta oo Ingiriisi ah. Waxaan kuugu sharxi karaa Af-Soomaali, hagaajin karaa jumladahaaga, waanan kula yeelan karaa practice.<br><small>Ask anything about English. I explain in Somali, fix your sentences and practise with you.</small></p>
    <div class="chips tchips" role="group" aria-label="Try asking">${QUICK.map((q, i) => `<button class="chipb" data-tchip="${i}">${esc(q.label)}</button>`).join('')}</div>
    <p class="mut tnote"><small>Your messages are sent to an AI service to get an answer. Do not share passwords or personal ID numbers.</small></p></div>`;
  const typing = () => '<div class="tm a" role="status" aria-label="Tutor is typing"><span class="tav sm" aria-hidden="true">' + icon('sparkle') + '</span><div class="tb typing"><i></i><i></i><i></i></div></div>';
  const list = () => (st.msgs.length ? st.msgs.map(bubble).join('') : welcome()) + (st.busy ? typing() : '');
  const counter = () => { const n = st.draft.length; return n > TUTOR.maxChars * 0.8 ? `<span class="tcount${n > TUTOR.maxChars ? ' over' : ''}">${n}/${TUTOR.maxChars}</span>` : ''; };

  function chat() {
    const sendOff = st.busy || !st.draft.trim() ? ' disabled' : '';
    return `<section class="tutor" aria-label="AI Tutor"><div class="thead"><div class="tt"><span class="tav" aria-hidden="true">${icon('sparkle')}</span><div><b>NORA Tutor</b><small class="mut">Soomaali · English</small></div></div>
      <button class="ib sm" data-tclear="1" aria-label="Clear chat (Tirtir)" ${st.msgs.length ? '' : 'disabled'}>${icon('trash')}</button></div>
      <div class="tprefs"><label class="sr" for="tlv">Level</label><select id="tlv" aria-label="Level">${LEVELS.map(l => `<option value="${l}" ${st.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label class="sr" for="tso">Explanations</label><select id="tso" aria-label="Explanation language">${SOMALI_MODES.map(([v, t]) => `<option value="${v}" ${st.somali === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="tmsgs" id="tmsgs" role="log" aria-live="polite" aria-label="Conversation">${list()}</div>
      <div class="tcomposer">${online() ? '' : '<p class="tbanner" role="status">Internet ma jiro · You are offline. Messages are kept; retry when you are back online.</p>'}<p class="terrline" id="terr" role="alert">${esc(st.err)}</p>
      <div class="tbox"><textarea id="tin" rows="1" maxlength="${TUTOR.maxChars + 200}" aria-label="Message to the tutor" placeholder="Qor su'aashaada…" enterkeyhint="send">${esc(st.draft)}</textarea>
      <button class="p ib" id="tsend" aria-label="Send (Dir)" ${sendOff.trim()}>${icon('send')}</button></div><div class="tmeta" id="tcount">${counter()}</div></div></section>`;
  }
  const gate = (title, body, btn) => `<section class="tutor-gate"><span class="tav lg" aria-hidden="true">${icon('sparkle')}</span><h1>${title}</h1><p class="mut">${body}</p>${btn ?? ''}</section>`;
  function view() {
    if (!configured) return gate('NORA Tutor', 'AI Tutor needs cloud setup. Copy <code>config.example.js</code> to <code>config.js</code> with your Supabase URL and anon key, deploy the <code>tutor</code> function, then reopen the app. See docs/TUTOR.md.<br><small>Tutor-ku wuxuu u baahan yahay habaynta Supabase.</small>');
    if (!signedIn()) return gate('NORA Tutor', 'Fadlan gal akoonkaaga si aad u isticmaasho tutor-ka.<br><small>Sign in under Me → Account &amp; sync to chat with the tutor.</small>', '<button class="p" data-t="me">Go to Account · Gal</button>');
    if (st.uid === undefined || st.uid !== curUid()) return '<div class="card tutor-wait" role="status">Preparing your tutor…</div>';
    return chat();
  }
  // ---- loading: called from render(); returns a promise only when work is needed ----
  const needsLoad = () => configured && signedIn() && !st.loading && st.uid !== curUid();
  async function load() {
    const uid = curUid(); st.loading = true; st.gen++;
    try {
      st.msgs = sanitizeStored(await repo.meta(histKey(uid), [])); const p = await repo.meta('tutorPrefs', {});
      st.level = LEVELS.includes(p?.level) ? p.level : (LEVELS.includes(defaultLevel()) ? defaultLevel() : 'A1');
      st.somali = SOMALI_MODES.some(([v]) => v === p?.somali) ? p.somali : 'high'; st.uid = uid; st.busy = false; st.err = ''; st.draft = '';
    } catch { st.msgs = []; st.uid = uid; } finally { st.loading = false; }
  }
  const reset = () => { st.gen++; st.ctl?.abort?.(); st.ctl = null; st.uid = undefined; st.msgs = []; st.busy = false; st.draft = ''; st.err = ''; };
  // ---- partial refresh: update the message list and composer without recreating the textarea ----
  function patch(scroll = true) {
    const d = dom(); if (!d) return; const box = d.getElementById('tmsgs'); if (!box) return;
    box.innerHTML = list(); if (scroll && box.scrollTo) box.scrollTo({ top: box.scrollHeight, behavior: 'auto' }); else if (scroll) box.scrollTop = box.scrollHeight;
    const send = d.getElementById('tsend'); if (send) send.disabled = st.busy || !st.draft.trim();
    const clr = d.querySelector?.('[data-tclear]'); if (clr) clr.disabled = !st.msgs.length;
    const er = d.getElementById('terr'); if (er) er.textContent = st.err; const c = d.getElementById('tcount'); if (c) c.innerHTML = counter();
  }
  async function run(id) {
    const gen = st.gen, ctl = typeof AbortController === 'function' ? new AbortController() : null; st.ctl = ctl; st.busy = true;
    const target = st.msgs.find(m => m.id === id); if (!target) { st.busy = false; return; } target.status = 'pending'; delete target.error; patch();
    const r = online() ? await ask(buildContext(st.msgs, id), { level: st.level, somaliLevel: st.somali, signal: ctl?.signal }) : { ok: false, error: 'offline', message: tutorMessage('offline') };
    if (gen !== st.gen) return; // chat cleared or account changed while waiting: drop the late answer
    st.busy = false; st.ctl = null;
    if (r.error === 'aborted') { target.status = 'failed'; target.error = { code: 'interrupted', message: '' }; }
    else if (r.ok) { target.status = 'sent'; const at = st.msgs.findIndex(m => m.id === id); st.msgs.splice(at + 1, 0, newMsg('assistant', r.reply, r.truncated ? { truncated: true } : {})); }
    else { target.status = 'failed'; target.error = { code: r.error, message: r.message }; }
    st.msgs = trimHistory(st.msgs); await persist(); patch();
  }
  async function send(raw) {
    if (st.busy) return false; // one request at a time: blocks double taps and key repeat before anything async happens
    const text = String(raw ?? '').trim(); if (!text || !configured || !signedIn() || st.uid !== curUid()) return false;
    if (text.length > TUTOR.maxChars) { st.err = `Fariintu aad bay u dheer tahay (${text.length}/${TUTOR.maxChars}). Message too long.`; patch(false); return false; }
    st.busy = true; st.err = ''; const m = newMsg('user', text, { status: 'pending' }); st.msgs = trimHistory([...st.msgs, m]); st.draft = '';
    const d = dom(), ta = d?.getElementById('tin'); if (ta) { ta.value = ''; if (ta.style) ta.style.height = ''; }
    await persist(); await run(m.id); return true;
  }
  async function retry(id) { if (st.busy || !st.msgs.some(m => m.id === id && m.role === 'user' && m.status === 'failed')) return false; st.busy = true; st.err = ''; await run(id); return true; }
  async function clear() {
    if (!st.msgs.length) return; if (!await confirm({ title: 'Clear chat? · Tirtir wada-hadalka?', body: 'All messages in this conversation will be deleted from this device. This cannot be undone. (Fariimaha oo dhan waa la tirtiri doonaa.)', yes: 'Clear', no: 'Cancel' })) return;
    st.gen++; st.ctl?.abort?.(); st.ctl = null; st.busy = false; st.msgs = []; st.err = ''; await persist(); rerender();
  }
  const focusIn = () => { const d = dom(); setTimeout(() => d?.getElementById('tin')?.focus?.(), 0); };
  async function click(t, d) {
    if (d.tchip !== undefined) { const q = QUICK[+d.tchip]; if (q) { st.draft = q.text; rerender(); focusIn(); } return true; }
    if (t.id === 'tsend') { await send(st.draft); return true; }
    if (d.tretry) { await retry(d.tretry); return true; }
    if (d.tcont) { await send('Sii wad. (Please continue your last answer.)'); return true; }
    if (d.tclear) { await clear(); return true; }
    return false;
  }
  function onInput(el) { st.draft = el.value; if (st.err) st.err = ''; if (el.style) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight || 0, 140) + 'px'; } patch(false); }
  // Enter sends on devices with a keyboard; on touch screens Enter inserts a new line and the Send button sends. Shift+Enter is always a new line.
  const coarse = () => !!globalThis.matchMedia?.('(pointer: coarse)')?.matches;
  function onKey(e) { if (e.target?.id !== 'tin' || e.key !== 'Enter' || e.shiftKey || e.isComposing || coarse()) return false; e.preventDefault?.(); send(st.draft); return true; }
  async function onChange(id, value) { if (id === 'tlv' && LEVELS.includes(value)) st.level = value; else if (id === 'tso' && SOMALI_MODES.some(([v]) => v === value)) st.somali = value; else return false; await savePrefs(); return true; }
  // Keep the draft and focus across a full re-render (for example when the network status changes).
  const beforeRender = () => { const d = dom(), a = d?.activeElement; st.focus = a?.id === 'tin' ? [a.selectionStart ?? null, a.selectionEnd ?? null] : null; };
  const afterRender = () => { const d = dom(); const box = d?.getElementById('tmsgs'); if (box) { if (box.scrollTo) box.scrollTo({ top: box.scrollHeight, behavior: 'auto' }); else box.scrollTop = box.scrollHeight; } if (st.focus) { const ta = d.getElementById('tin'); ta?.focus?.(); if (ta?.setSelectionRange && st.focus[0] !== null) try { ta.setSelectionRange(...st.focus); } catch {} st.focus = null; } };
  return { view, needsLoad, load, reset, click, onInput, onKey, onChange, beforeRender, afterRender, send, retry, clear, state: st };
}
