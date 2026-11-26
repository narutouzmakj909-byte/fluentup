import { newCard, review, dueCards, stats } from './core/srs.js';
import { streak, dayKey, nextAlarm, challengeProgress } from './core/schedule.js';
import { PRESETS, makeChallenge, missedDays, achievements, pauseChallenge, resumeChallenge, pausedDays } from './core/discipline.js';
import { importEntries, buildIndex, search, browse, toggle } from './core/library.js';
import { buildQuiz } from './core/quiz.js';
import { gradeAnswer, scoreSession, LEVELS } from './core/exercises.js';
import { unifiedSearch, pushRecent } from './core/search.js';
import { monthGrid } from './core/calendar.js';
import { validateLesson, validateConversation, begin, choose, isDone, percent, recordBest } from './core/lessons.js';
import { Repo, IdbStore, MemoryStore } from './core/store.js';
import { buildBackup, parseBackup, pickCard, mergeMetaValue, backupDue, META_KEYS } from './core/backup.js';
import { checkWriting, suggestVocab, grammarHints } from './core/writing.js';
import { dailyReviews, skills, mistakeTrend, studyMinutes, monthly, weekly, streakHistory } from './core/analytics.js';
import { syncNative, nativeAvailable } from './core/notify.js';
import { capabilities, wordMatch } from './core/speech.js';
import { createSupabase } from './core/supabase.js';
import { createTutor } from './core/tutor.js';
import { createTutorScreen } from './ui/tutorScreen.js';
import { icon, iconFill, LiquidGlassProgress, LiquidGlassToggle, LiquidGlassTab, LiquidGlassChip, confirmSheet, enter, setNav, initGlass } from './ui/glass.js';
const app = document.getElementById('app'), esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const load = async f => { try { const j = await (await fetch('src/data/' + f + '.json')).json(); return Array.isArray(j) ? j : []; } catch { return []; } };
const { ok: entries } = importEntries([...await load('seed'), ...await load('seed2'), ...await load('seed3'), ...await load('seed4'), ...await load('seed5')]);
let cfg = {}; try { cfg = (await import('../config.js')).default ?? {}; } catch {} // optional, gitignored; see config.example.js
const sb = createSupabase({ url: cfg.SUPABASE_URL, anonKey: cfg.SUPABASE_ANON_KEY, storage: globalThis.localStorage });
// Restore/refresh the persisted Supabase session before selecting the user's local database.
if (sb) await sb.initialize();
// Each signed-in account gets a separate local database; never reuse another account's study data.
const dbName = sb?.user()?.id ? `nora-user-${sb.user().id}` : 'nora-guest';
let repo; try { repo = new Repo(new IdbStore(dbName)); await repo.cards(); } catch { repo = new Repo(new MemoryStore()); }
const CAP = capabilities();
// AI Tutor: requests go to the Supabase Edge Function with the signed-in user's token; no AI key exists in this app.
const askTutor = sb ? createTutor({ url: cfg.SUPABASE_URL, token: () => sb.accessToken(), refresh: async () => { try { await sb.refresh(); return true; } catch { return false; } } }) : null;
const tutor = createTutorScreen({ repo, ask: (m, o) => askTutor(m, o), configured: !!sb, user: () => sb?.user() ?? null, signedIn: () => !!sb?.signedIn(), online: () => navigator.onLine, rerender: () => render(), defaultLevel: () => S.prof?.level });
const lessons = [...new Map([...await load('grammar'), ...await load('grammar2'), ...await load('grammar3'), ...await load('grammar4'), ...await load('reading'), ...await load('reading2'), ...await load('professional'), ...await load('professional2'), ...await load('professional3'), ...await load('professional4'), ...await load('reading3'), ...await load('reading4')].filter(l => !validateLesson(l).length).map(l => [l.id, l])).values()],
  listenL = [...await load('listening'), ...await load('listening2'), ...await load('listening3'), ...await load('listening4')].filter(l => l.id && LEVELS.includes(l.level) && Array.isArray(l.sentences) && l.sentences.length && Array.isArray(l.questions) && l.questions.length),
  writeP = [...await load('writing'), ...await load('writing2'), ...await load('writing3')].filter(w => w.id && LEVELS.includes(w.level) && w.prompt && Number.isInteger(w.minWords)), convos = [...await load('conversations'), ...await load('conversations2'), ...await load('conversations3'), ...await load('conversations4')].filter(c => !validateConversation(c).length);
const byId = new Map(entries.map(e => [e.id, e])), idx = buildIndex(entries);
const S = { cards: {}, days: await repo.meta('days', []), alarms: await repo.alarms(), challenges: await repo.challenges(), goal: await repo.meta('goal', { vocab: 5 }), saved: await repo.meta('saved', []), rest: await repo.meta('rest', []), lastBackup: await repo.meta('lastBackup', 0), tsize: await repo.meta('tsize', 'md'), theme: await repo.meta('theme', 'system'), lp: await repo.meta('lessonProg', {}), cp: await repo.meta('convoProg', {}), recent: await repo.meta('recent', []), listen: await repo.meta('listenProg', {}), speak: await repo.meta('speakLog', []), write: await repo.meta('writeLog', []), mist: await repo.meta('lessonMist', []), tlog: await repo.meta('timeLog', []), prof: await repo.meta('profile', {}), notif: await repo.meta('notif', { snooze: 10 }), rh: await repo.meta('readHist', []), lsaved: await repo.meta('lessonSaved', []), nat: null };
// Legacy shared-device data is intentionally not imported into account databases.
for (const c of await repo.cards()) S.cards[c.id] = c;
for (const e of entries) if (!S.cards[e.id]) S.cards[e.id] = await repo.saveCard(newCard(e.id));
// Keep the signup display name in the existing local profile without overwriting a chosen profile name.
const accountName = String(sb?.user()?.user_metadata?.full_name ?? '').trim().slice(0, 80);
if (accountName && !S.prof.name) { S.prof = { ...S.prof, name: accountName }; await repo.putMeta('profile', S.prof); }
const today = () => dayKey(new Date()), cards = () => Object.values(S.cards);
let tab = 'home', showAns = false, quiz = null, pending = (await repo.pending()).length, timers = [];
async function grade(id, g) {
  S.cards[id] = await repo.saveCard(review(S.cards[id], g));
  if (!S.days.includes(today())) { S.days.push(today()); await repo.putMeta('days', S.days); }
  pending = (await repo.pending()).length;
}
const bar = p => LiquidGlassProgress(p);
const todayN = () => cards().flatMap(c => c.history).filter(h => dayKey(new Date(h.at)) === today()).length;
const ach = () => achievements({ streak: streak(S.days, today(), S.rest), reviews: cards().reduce((n, c) => n + c.history.length, 0), mastered: stats(cards()).mastered });
const recommend = () => { const due = stats(cards()).due; if (due) return `Review ${due} due item${due > 1 ? 's' : ''}`; if (!Object.keys(S.lp).length) return 'Try a grammar lesson (Learn → Grammar)'; if (!Object.keys(S.listen).length) return 'Try a listening exercise (Speak → Listen)'; if (!S.write.length) return 'Write a short text (Speak → Write)'; if (!S.speak.length) return 'Practise repeating sentences (Speak → Speak)'; return 'Play a conversation (Speak → Talk)'; };
const onboard = () => S.prof.onboarded ? '' : `<div class="card"><h2 style="margin-top:0">Ku soo dhawow NORA — Welcome to NORA</h2><p class="mut">Tell us where you are starting. Everything works offline and you can change these later.</p><p><label for="obn">Name</label><input id="obn" placeholder="Your name (optional)" aria-label="Name" maxlength="80" style="width:100%"></p><div class="row"><div><label for="obl">Level</label><select id="obl" aria-label="Level">${opts(LEVELS, 'A1', 'Level').replace('<option value="">Level</option>', '')}</select></div><div><label for="obg">Reviews per day</label><input id="obg" type="number" min="1" max="500" value="${S.goal.vocab}" aria-label="Reviews per day" style="width:90px"></div></div><div class="row" style="margin-top:12px"><button class="p" id="obsave">Start learning</button><button id="obskip">Skip</button></div></div>`;
const ico = k => icon(k);
const li = (attr, lvl, title, sub) => `<button class="opt card item" ${attr}><span class="pill">${lvl}</span> · <b>${title}</b><br><span class="mut">${sub}</span></button>`;
const head = (t, lede) => `<h1>${t}</h1><p class="lede">${lede}</p>`;
const tile = (t, k, title, sub, cls = '') => `<button class="tile${cls}" data-t="${t}">${ico(k)}<b>${title}</b><small>${sub}</small></button>`;
const home = () => { const st = stats(cards()), n = todayN(), g = S.goal.vocab, ch = S.challenges[0], got = ach().filter(a => a.earned), pct = Math.min(100, Math.round(100 * n / g)), sk = streak(S.days, today(), S.rest);
  const sk2 = skills({ lp: S.lp, cp: S.cp, listen: S.listen, speak: S.speak, write: S.write, cards: cards(), lessons }), nxt = S.alarms.filter(a => a.enabled).map(a => ({ a, at: nextAlarm(a) })).filter(x => x.at).sort((x, y) => x.at - y.at)[0];
  const skl = [['Vocabulary', sk2.vocabulary.accuracy], ['Grammar', sk2.grammar.avg], ['Reading', sk2.reading.avg], ['Listening', sk2.listening.avg], ['Talk', sk2.conversation.avg]], hr = new Date().getHours();
  return `<p class="mut" style="margin:10px 0 0">${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}</p><h1 style="margin-top:0">${S.prof.name ? 'Hi, ' + esc(S.prof.name) : 'Welcome back'}</h1>${onboard()}
  <section class="card hero" aria-label="Today"><div class="hero-row"><div class="ring" style="--p:${pct}" role="img" aria-label="${pct}% of today's goal"><span>${pct}%</span></div><div><b style="font-size:1.15rem">Today's goal</b><br><span class="mut">${n}/${g} reviews</span><div style="margin-top:6px"><span class="streak">${icon('flame')}${sk} day${sk === 1 ? '' : 's'}</span><span class="streak">${icon('cards')}${st.due} due</span></div><small class="sr">Streak: ${sk} day${sk === 1 ? '' : 's'}</small></div></div>${bar(pct)}</section>
  <button class="cta" data-t="${st.due ? 'review' : 'library'}"><span><small class="mut">Continue learning</small><br><b>${esc(recommend())}</b></span><span aria-hidden="true">${icon('arrow')}</span></button>
  <p class="sr">${st.due} due · ${st.new} new · ${st.learning} learning · ${st.difficult} difficult · ${st.mastered} mastered</p><div class="stats" style="margin-top:12px" aria-hidden="true"><div class="stat"><b>${st.due}</b><small>due</small></div><div class="stat"><b>${st.new}</b><small>new</small></div><div class="stat"><b>${st.learning}</b><small>learning</small></div><div class="stat"><b>${st.difficult}</b><small>difficult</small></div><div class="stat"><b>${st.mastered}</b><small>mastered</small></div><div class="stat"><b>${sk}</b><small>day streak</small></div></div>
  ${backupDue({ reviews: cards().reduce((n, c) => n + c.history.length, 0), lastBackup: S.lastBackup }) ? '<div class="card banner" role="note"><b>Back up your progress</b><p class="mut" style="margin:.3em 0 .8em">Everything is stored on this device. Save a backup file so a lost phone or cleared browser data does not erase it.</p><button class="p" data-t="me">Open Settings</button></div>' : ''}
  <h2>Today's plan</h2><div class="card"><div class="row" style="justify-content:space-between"><span><b>${st.due ? `Review ${st.due} due` : 'Nothing due'}</b><br><span class="mut">${n >= g ? 'Daily goal reached' : `${g - n} more to reach your goal`}</span></span><button class="ib sm" data-t="${st.due ? 'review' : 'quiz'}" aria-label="${st.due ? 'Start review' : 'Start quiz'}">${icon('play')}</button></div>${nxt ? `<p class="mut" style="margin:10px 0 0">${icon('bell', 'inl')} Next reminder ${esc(nxt.a.label || 'time to learn')} · ${new Date(nxt.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>` : ''}</div>
  ${ch ? (p => `<div class="card"><b>${esc(ch.title)}</b> <span class="mut">${p.completed}/${ch.days} days</span>${bar(p.percent)}</div>`)(challengeProgress(ch, S.days, today())) : ''}
  <h2>Quick actions</h2><div class="tiles">${tile('tutor', 'sparkle', 'AI Tutor', 'Af-Soomaali ku sharax · Ask in Somali or English', ' wide')}${tile('review', 'cards', 'Review', st.due + ' due now')}${tile('library', 'book', 'Library &amp; grammar', 'Words, lessons, reading')}${tile('speak', 'ear', 'Listen &amp; speak', 'Audio, talk, record')}${tile('quiz', 'pen', 'Quick quiz', '5 questions, updates reviews')}</div>
  <h2>Skills</h2><div class="card" aria-label="Skills overview">${skl.map(([k, v]) => `<div class="skbar"><span>${k}</span>${bar(v ?? 0)}<b>${v === null ? '–' : v + '%'}</b></div>`).join('')}<p class="mut" style="margin:8px 0 0;font-size:.8rem">Average best scores. Dashes mean no data yet.</p></div>
  <div class="card"><b>Achievements</b><p class="mut">${got.length ? got.map(a => esc(a.title)).join(' · ') : 'None yet. Finish a review to earn the first.'}</p></div>
  <p class="mut" style="font-size:.85rem">${navigator.onLine ? 'Online' : 'Offline'} · ${pending} change(s) waiting to sync${sb ? '' : ' (no server configured)'}</p>`; };
function reviewView() {
  const due = dueCards(cards()), c = due[0]; if (!c) return `<div class="card flash"><h2>All caught up</h2><p class="mut">Nothing due. Come back later.</p><div><button class="p" data-t="quiz">Try a quick quiz</button></div></div>`; const e = byId.get(c.id);
  return `<p class="mut" style="margin:0">${due.length} due${e.level ? ' · ' + esc(e.level) : ''}</p><div class="card flash"><span class="pill" style="align-self:center">${esc(e.type ?? 'word')}</span><h2>${esc(e.en)}</h2>${showAns ? `<p>${esc(e.def)}</p><p class="mut">${esc(e.ex[0])}</p>` : '<p class="mut">Try to recall the meaning first.</p>'}</div>${showAns ? `<div class="grades">${[['Again', 0], ['Hard', 3], ['Good', 4], ['Easy', 5]].map(([l, g]) => `<button data-g="${g}">${l}</button>`).join('')}</div>` : `<button class="p opt" id="show" style="text-align:center">Show answer</button>`}`;
}
function quizView() {
  if (!quiz) return `<div class="card flash"><h2>Quick quiz</h2><p class="mut">5 questions from your library. Results update your review schedule.</p><div class="row" style="justify-content:center"><button class="p" id="start">Start</button> <button data-t="review">Review due (${stats(cards()).due})</button></div></div>`;
  if (quiz.i >= quiz.qs.length) { const s = scoreSession(quiz.res), pc = Math.round(s.accuracy * 100); return `<div class="card flash"><div class="ring" style="--p:${pc};align-self:center;background:conic-gradient(var(--ac) calc(var(--p)*1%),var(--bd) 0)"><span style="background:var(--card);color:var(--fg)">${pc}%</span></div><h2>${s.correct}/${s.total} correct</h2><p>Accuracy ${pc}%</p>${s.reviewList.length ? `<p class="mut">To review: ${s.reviewList.map(i => esc(byId.get(i).en)).join(', ')}</p>` : '<p class="mut">Perfect round.</p>'}<div><button class="p" id="start">Again</button></div></div>`; }
  const q = quiz.qs[quiz.i];
  return `<p class="mut" style="margin:0">${quiz.i + 1} / ${quiz.qs.length}</p>${bar(Math.round(100 * quiz.i / quiz.qs.length))}<div class="card"><h3>${esc(q.prompt)}</h3>${q.type === 'mcq' ? q.options.map((o, k) => `<button class="opt" data-o="${k}">${esc(o)}</button>`).join('') : `<p class="mut">${esc(q.hint)}</p><input id="fill" aria-label="Answer" autocomplete="off" style="width:100%"> <button class="p" id="submit" style="margin-top:8px">Check</button>`}</div>`;
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const alarmView = () => `<h2>Reminders</h2><p class="mut">Alarms fire only while this page is open. Reliable background alarms need the Android app (not built yet).</p>
<div class="card"><input id="at" type="time" value="08:00" aria-label="Time"> <input id="al" placeholder="Label" aria-label="Label"><p>${DAYS.map((d, i) => `<label class="chip"><input type="checkbox" name="d" value="${i}"> ${d}</label>`).join('')}</p><button class="p" id="addAlarm">Add alarm</button></div>
${S.alarms.map(a => { const n = nextAlarm(a); return `<div class="card"><b>${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')}</b> ${esc(a.label)} <span class="mut">${a.days.length ? a.days.map(d => DAYS[d]).join(' ') : 'Daily'} · ${a.enabled ? 'next ' + n.toLocaleString() : 'off'}</span><div class="row">${LiquidGlassToggle({ id: 'tg' + a.id, label: a.enabled ? 'On' : 'Off', on: a.enabled, attrs: `data-tg="${a.id}"` })}<button data-rm="${a.id}">Delete</button></div></div>`; }).join('')}`;
const chalView = () => { const t = today();
  return `<h2>Daily goal</h2><div class="card"><input id="gv" type="number" min="1" max="500" value="${S.goal.vocab}" aria-label="Reviews per day"> <button id="setGoal">Save</button></div>
<h2>Challenges</h2><div class="card"><div class="row">${PRESETS.map(d => `<button data-ch="${d}">${d} days</button>`).join('')}</div><p><input id="cd" type="number" min="1" max="3650" placeholder="Custom days" aria-label="Custom days"> <button id="cc">Start custom</button></p></div>
${S.challenges.map(c => { const p = challengeProgress(c, S.days, t); return `<div class="card"><b>${esc(c.title)}</b> <span class="mut">${c.start} to ${p.end}</span>${bar(p.percent)}<p class="mut">${p.completed}/${c.days} done · ${missedDays(c, S.days, t, [...S.rest, ...pausedDays(c, t)])} missed${p.finished ? ' · finished' : ''}${c.pausedFrom ? ' · PAUSED since ' + c.pausedFrom : ''}</p><button data-cp="${c.id}">${c.pausedFrom ? 'Resume' : 'Pause'}</button> <button data-rc="${c.id}">Delete</button></div>`; }).join('') || '<p class="mut">No active challenges.</p>'}
<h2>Achievements</h2>${ach().map(a => `<div class="card">${a.earned ? '✓' : '○'} ${esc(a.title)}</div>`).join('')}`; };
const planView = () => { const t = today(), sk = streak(S.days, t, S.rest), n = todayN(), g = S.goal.vocab, pct = Math.min(100, Math.round(100 * n / g));
  return `<h1>Plan</h1><div class="card hero"><div class="hero-row"><div class="ring" style="--p:${pct}"><span>${sk}</span></div><div><b style="font-size:1.1rem">Streak: ${sk} day${sk === 1 ? '' : 's'}</b><br><span class="mut">${n}/${g} reviews today</span></div></div></div>` + chalView() + calView() + alarmView(); };
const startChallenge = async days => { const c = makeChallenge({ days, start: today() }, crypto.randomUUID()); await repo.putChallenge(c); S.challenges.push(c); render(); };
let lrun = null, crun = null, gq = '';
const getL = id => id === '__mist' ? { id, title: 'Mistake review', track: 'grammar', level: 'A1', explanation: 'Exercises you answered wrongly before. Answer correctly to clear them.', examples: ['Each cleared exercise is removed from this list.'], exercises: S.mist.map(m => m.q) } : lessons.find(x => x.id === id);
let lastAct = 0;
async function tick() { const n = Date.now(), dl = lastAct && n - lastAct < 120000 ? n - lastAct : 0; lastAct = n; if (!dl) return; const d = today(); let r = S.tlog.find(x => x.day === d); if (!r) { r = { day: d, ms: 0 }; S.tlog.push(r); S.tlog = S.tlog.slice(-400); } r.ms += dl; await repo.setMeta('timeLog', S.tlog); }
let lib = { mode: 'library', q: '', type: '', level: '', saved: false, page: 1, detail: null }, cal = { y: new Date().getUTCFullYear(), m: new Date().getUTCMonth() };
function applyTheme() { const r = document.documentElement; if (!r) return; if (r.dataset) r.dataset.size = S.tsize ?? 'md'; if (S.theme === 'system') delete r.dataset.theme; else r.dataset.theme = S.theme; }
const opts = (list, cur, all) => `<option value="">${all}</option>` + list.map(v => `<option value="${v}" ${cur === v ? 'selected' : ''}>${v}</option>`).join('');
function detailView() { const e = byId.get(lib.detail), c = S.cards[e.id], sv = S.saved.includes(e.id);
  return `<button class="back" data-back="1">${icon('back')}Back</button><div class="card detail"><h2 style="margin-top:0;font-size:1.7rem">${esc(e.en)}</h2><p class="mut">${e.level} · ${esc(e.type.replace('_', ' '))}${e.ipa ? ' · ' + esc(e.ipa) : ''}${e.register ? ' · ' + esc(e.register) : ''}${e.region ? ' · ' + esc(e.region) : ''}${e.separable !== undefined ? (e.separable ? ' · separable' : ' · inseparable') : ''}</p>${e.warning ? `<p class="warn">⚠ ${esc(e.warning)}</p>` : ''}<p>${esc(e.def)}</p>
  ${e.somali ? `<p>${esc(e.somali)}</p>` : '<p class="mut">Somali explanation: not added yet (needs a human reviewer).</p>'}<ul class="ex">${e.ex.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <p class="mut">${esc(c.state)} · reviewed ${c.history.length}× · next review ${new Date(c.due).toLocaleDateString()}</p><button class="${sv ? 'p' : ''}" data-bm="${e.id}">${sv ? '★ Saved' : '☆ Save'}</button></div>`; }
function vocabView() {
  const pool = lib.q ? search(idx, byId, lib.q, { limit: 1e9 }) : entries, r = browse(pool, { type: lib.type, level: lib.level, only: lib.saved ? new Set(S.saved) : null, page: lib.page });
  return `<label class="fld" for="q">${icon('search')}<input id="q" aria-label="Search library" placeholder="Search…" value="${esc(lib.q)}"></label>
  <div class="row" style="margin:8px 0"><select id="ft" aria-label="Type">${opts([...new Set(entries.map(e => e.type))], lib.type, 'All types')}</select><select id="fl" aria-label="Level">${opts(LEVELS, lib.level, 'All levels')}</select><label class="chip" for="fs"><input id="fs" type="checkbox" ${lib.saved ? 'checked' : ''}> Saved</label></div>
  <p class="mut">${r.total} entr${r.total === 1 ? 'y' : 'ies'}</p>${r.items.map(e => `<button class="opt card item" data-open="${e.id}"><span class="item-h"><b>${S.saved.includes(e.id) ? '★ ' : ''}${esc(e.en)}</b> · <span class="pill">${e.level}</span></span> — <span class="mut">${esc(e.def)}</span></button>`).join('') || '<p class="mut">No matching entries.</p>'}
  ${r.page < r.pages ? '<button data-more="1">Show more</button>' : ''}`; }
const MODES = [['library', 'Library'], ['grammar', 'Grammar'], ['reading', 'Reading'], ['professional', 'Professional'], ['search', 'Search']];
const libraryView = () => lib.detail ? detailView() : `<div class="row seg" style="margin-bottom:12px">${MODES.map(([m, t]) => `<button data-lm="${m}" aria-pressed="${lib.mode === m}">${t}</button>`).join('')}</div>` + (lib.mode === 'library' ? vocabView() : lib.mode === 'search' ? searchView() : grammarView());
const hl = (text, gl) => { let s = esc(text); for (const g of gl) { const w = esc(g.split(':')[0].trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); s = s.replace(new RegExp(`\\b(${w})\\b`, 'gi'), '<mark>$1</mark>'); } return s; };
function searchView() { const r = unifiedSearch(gq, { entries, lessons, convos, extra: [...listenL.map(l => ({ kind: 'listen', id: l.id, title: l.title, sub: `listening · ${l.level}`, text: l.sentences.join(' ') })), ...writeP.map(w => ({ kind: 'write', id: w.id, title: w.title, sub: `writing · ${w.level}`, text: w.prompt }))] });
  return `<label class="fld" for="gq">${icon('search')}<input id="gq" aria-label="Search everything" placeholder="Search words, lessons, conversations…" value="${esc(gq)}"></label>` + (gq.trim()
    ? (r.map(x => `<button class="opt card" data-sr="${x.kind}:${x.id}">${esc(x.title)}<br><span class="mut">${esc(x.sub)}</span></button>`).join('') || '<p class="mut">No results.</p>')
    : S.recent.length ? `<p class="mut">Recent</p><div class="row">${S.recent.map(q => LiquidGlassChip(esc(q), { attrs: `data-rq="${esc(q)}"` })).join('')}</div>` : '<p class="mut">Type to search all content.</p>'); }
const progLine = (p, none = 'Not started') => p ? `best ${p.best}% · ${p.attempts} attempt(s)` : none;
async function markStudied() { if (!S.days.includes(today())) { S.days.push(today()); await repo.putMeta('days', S.days); } }
function histBox() { if (lib.mode === 'grammar') return ''; const tr = lib.mode, inT = id => (getL(id)?.track ?? 'grammar') === tr, rh = S.rh.filter(h => getL(h.id) && inT(h.id)).slice(0, 5), bm = S.lsaved.filter(id => getL(id) && inT(id));
  return `<div class="row" style="margin:8px 0"><button data-lbmf="1" aria-pressed="${!!lib.lbm}">★ Bookmarks (${bm.length})</button></div>${rh.length ? `<div class="card"><b>Recently completed</b>${rh.map(h => `<div><button data-ls="${h.id}">${esc(getL(h.id).title)}</button> <span class="mut">${h.pct}% · ${new Date(h.at).toLocaleDateString()}</span></div>`).join('')}</div>` : ''}`; }
function grammarView() { if (lrun) return lessonRun();
  const mp = lib.mode === 'grammar' ? `<select id="gl" aria-label="Level">${opts(LEVELS, lib.gl, 'All levels')}</select>${S.mist.length ? ` <button data-ls="__mist">Review ${S.mist.length} mistake(s)</button>` : ''}` : '';
  return mp + histBox() + lessons.filter(l => (l.track ?? 'grammar') === lib.mode && (!lib.gl || lib.gl === l.level) && (!lib.lbm || S.lsaved.includes(l.id))).map(l => `${li(`data-ls="${l.id}"`, l.level, `${esc(l.title)}${l.titleSo ? `<br><span class="mut">${esc(l.titleSo)}</span>` : ''}`, progLine(S.lp[l.id]))}`).join('') || '<p class="mut">No lessons here yet.</p>'; }
function lessonRun() { const l = getL(lrun.id), back = `<button class="back" data-lback="1">${icon('back')}Back</button>`;
  if (lrun.i < 0) return `${back}<div class="card"><h2>${esc(l.title)}</h2>${l.titleSo ? `<p class="mut">${esc(l.titleSo)}</p>` : ''}<p>${l.track === 'reading' ? hl(l.explanation, l.examples) : esc(l.explanation)}</p>${l.explanationSo ? `<p class="mut"><b>Af-Soomaali:</b> ${esc(l.explanationSo)}</p>` : ''}${l.track === 'reading' ? '<p class="mut">Glossary / Erey-bixin</p>' : ''}<ul>${l.examples.map((x, k) => `<li>${esc(x)}${l.examplesSo?.[k] ? `<br><span class="mut">${esc(l.examplesSo[k])}</span>` : ''}</li>`).join('')}</ul>${l.somali ? `<p><b>Somali · Sharaxaad Soomaali:</b> ${esc(l.somali)} ${l.status === 'verified' ? '' : '<span class="mut">(qabyo / draft: needs native review)</span>'}</p>` : ''}${tenseBlock(l)}${l.mistakesSo ? `<p><b>Khaladaadka caadiga ah / Common mistakes:</b></p><ul>${l.mistakes.map((m, k) => `<li>${esc(m)}<br><span class="mut">${esc(l.mistakesSo[k] ?? '')}</span></li>`).join('')}</ul>` : l.mistakes ? `<p class="mut">Common mistakes: ${l.mistakes.map(esc).join(' · ')}</p>` : ''}<div class="row"><button class="p" data-lstart="1">Practice (${l.exercises.length})</button>${l.track !== 'grammar' ? `<button data-lbm="${l.id}" aria-pressed="${S.lsaved.includes(l.id)}">${S.lsaved.includes(l.id) ? '★ Bookmarked' : '☆ Bookmark'}</button>` : ''}</div></div>`;
  if (lrun.i >= l.exercises.length) { const s = scoreSession(lrun.res); return `${back}<div class="card flash"><h2>${s.correct}/${s.total} correct</h2><p>Accuracy ${Math.round(100 * s.accuracy)}%</p>${s.reviewList.length ? `<p class="mut">Review: ${s.reviewList.map(i => esc(l.exercises[i].prompt)).join(' · ')}</p>` : ''}</div>`; }
  const q = l.exercises[lrun.i], n = `<p class="mut" style="margin:0">${lrun.i + 1} / ${l.exercises.length}</p>${bar(Math.round(100 * lrun.i / l.exercises.length))}`;
  if (lrun.fb) return `${n}<div class="card ${lrun.fb.ok ? 'fb-ok' : 'fb-bad'}" role="status"><h3>${lrun.fb.ok ? 'Correct' : 'Not quite'}</h3><p>${esc(q.prompt)}</p>${q.promptSo ? `<p class="mut"><b>Af-Soomaali:</b> ${esc(q.promptSo)}</p>` : ''}${lrun.fb.ok ? '' : `<p>Answer: <b>${esc(q.type === 'mcq' ? q.options[q.answer] : Array.isArray(q.answer) ? q.answer.join(' ') : q.answer)}</b></p>`}<p class="mut">${esc(q.explain ?? '')}</p>${q.explainSo ? `<p><b>Soomaali:</b> ${esc(q.explainSo)}</p>` : ''}<button class="p" data-lnext="1">Next</button></div>`;
  return `${n}<div class="card"><h3>${esc(q.prompt)}</h3>${q.promptSo ? `<p class="mut"><b>Af-Soomaali:</b> ${esc(q.promptSo)}</p>` : ''}${q.type === 'mcq' ? q.options.map((o, k) => `<button class="opt" data-lo="${k}">${esc(o)}${q.optionsSo?.[k] ? `<br><span class="mut">${esc(q.optionsSo[k])}</span>` : ''}</button>`).join('') : q.type === 'order' ? orderUI(q) : '<input id="lfill" aria-label="Answer" autocomplete="off"> <button class="p" id="lsubmit">Check</button>'}</div>`; }
const tenseBlock = l => { if (!l.forms) return ''; const f = l.forms, row = a => `<li>${esc(a[0])}<br><span class="mut">${esc(a[1])}</span></li>`, sec = (t, a) => `<h3>${t}</h3><ul>${a.map(row).join('')}</ul>`;
  return `<p><b>Formula:</b> ${esc(l.formula)}</p>${sec('Affirmative / Xaqiijin', f.affirmative)}${sec('Negative / Diidmo', f.negative)}${sec('Questions / Su&#39;aalo', f.question)}${sec('WH questions / Su&#39;aalaha WH', f.wh)}`; };
const orderUI = q => { const sel = lrun.sel ?? [], used = new Set(sel); return `<p class="sel" aria-live="polite">${sel.map(i => esc(q.words[i])).join(' ') || '<span class="mut">Tap the words in order</span>'}</p><div class="row">${q.words.map((w, i) => used.has(i) ? '' : `<button data-ow="${i}">${esc(w)}</button>`).join('')}</div><div class="row" style="margin-top:8px"><button data-ou="1">Undo</button><button class="p" data-ok="1">Check</button></div>`; };
async function lanswer(v) { const l = getL(lrun.id), q = l.exercises[lrun.i], ok = gradeAnswer(q, v); lrun.res.push({ id: lrun.i, correct: ok }); lrun.fb = { ok }; lrun.sel = [];
  if (lrun.id === '__mist') { if (ok) S.mist = S.mist.filter(m => m.q !== q); } else if (!ok && !S.mist.some(m => m.lesson === l.id && m.q.prompt === q.prompt)) S.mist.push({ lesson: l.id, q }); else if (ok) S.mist = S.mist.filter(m => !(m.lesson === l.id && m.q.prompt === q.prompt));
  await repo.putMeta('lessonMist', S.mist); render(); }
async function lnext() { const l = getL(lrun.id); lrun.i++; lrun.fb = null;
  if (lrun.i >= l.exercises.length) { S.lp = recordBest(S.lp, l.id, Math.round(100 * scoreSession(lrun.res).accuracy)); await repo.putMeta('lessonProg', S.lp); if (l.track && l.track !== 'grammar') { S.rh = [{ id: l.id, at: Date.now(), pct: Math.round(100 * scoreSession(lrun.res).accuracy) }, ...S.rh].slice(0, 200); await repo.putMeta('readHist', S.rh); } await markStudied(); }
  render(); }
function talkView() { if (crun) return convoRun();
  return head('Conversations', 'Pre-written branching dialogues scored by fixed rules. No AI is involved.') + (convos.map(c => li(`data-cs="${c.id}"`, c.level, `${esc(c.title)}${c.titleSo ? `<br><span class="mut">${esc(c.titleSo)}</span>` : ''}`, progLine(S.cp[c.id], 'Not played'))).join('') || '<p class="mut">No conversations loaded.</p>'); }
function convoRun() { const c = convos.find(x => x.id === crun.c), st = crun.st, n = c.nodes[st.node], done = isDone(c, st);
  const last = st.path.at(-1), lastChoice = last ? c.nodes[last.node]?.choices?.[last.choice] : null;
  return `<button class="back" data-cback="1">${icon('back')}Back</button><p class="mut">${esc(c.context ?? '')}${c.contextSo ? `<br><span>${esc(c.contextSo)}</span>` : ''}</p>${st.feedback ? `<div class="card fb-ok" role="status"><span class="mut">Feedback:</span> ${esc(st.feedback)}${lastChoice?.feedbackSo ? `<p class="mut">${esc(lastChoice.feedbackSo)}</p>` : ''}</div>` : ''}
  <div class="bubble"><b>${esc(n.speaker ?? '')}</b><p>${esc(n.say)}</p>${n.saySo ? `<p class="mut">${esc(n.saySo)}</p>` : ''}</div>${done ? `<div class="card flash"><h2>${percent(st)}%</h2><p class="mut">Score for this run</p><button class="p" data-cs="${c.id}">Replay</button></div>`
    : n.choices.map((ch, i) => `<button class="opt" data-cc="${i}">${esc(ch.text)}${ch.textSo ? `<br><span class="mut">${esc(ch.textSo)}</span>` : ''}</button>`).join('')}`; }
async function cchoose(i) { const c = convos.find(x => x.id === crun.c); crun.st = choose(c, crun.st, i);
  if (isDone(c, crun.st)) { S.cp = recordBest(S.cp, c.id, percent(crun.st)); await repo.putMeta('convoProg', S.cp); await markStudied(); }
  render(); }
function calView() { const t = today(), since = [...S.days].sort()[0] ?? null, weeks = monthGrid(cal.y, cal.m, { done: S.days, rest: S.rest, today: t, since });
  const name = new Date(Date.UTC(cal.y, cal.m, 1)).toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }), mark = { done: '✓', rest: 'R', missed: '✕', today: '•' };
  return `<h2>Calendar</h2><div class="card"><div class="row" style="justify-content:space-between"><button class="ib sm" data-cal="-1" aria-label="Previous month">${icon('back')}</button><b>${name}</b><button class="ib sm" data-cal="1" aria-label="Next month">${icon('next')}</button></div>
  <table class="cal"><tr>${DAYS.map(d => `<th scope="col">${d[0]}</th>`).join('')}</tr>${weeks.map(w => `<tr>${w.map(c => c ? `<td class="c-${c.state}" aria-label="${c.date}: ${c.state}">${c.day}<br><small>${mark[c.state] ?? ''}</small></td>` : '<td></td>').join('')}</tr>`).join('')}</table>
  <p class="chips"><span class="pill">✓ studied</span><span class="pill">R rest day</span><span class="pill off">✕ missed</span><span class="pill ok">• today</span></p><button id="restToggle">${S.rest.includes(t) ? 'Remove today as rest day' : 'Mark today as rest day'}</button></div>`; }
// ---- Speak tab: Talk / Listen / Speak / Write -------------------------------------------------
let authMode = 'signin', authStep = 'credentials', authEmail = '', authName = '', authPasswordVisible = false, authBusy = false, bkMsg = '', sk = 'talk', lsn = null, wr = null, sp = { i: 0, err: '', rec: false, heard: null }, recs = (await Promise.all((await repo.recordings()).map(async r => { try { return { ...r, url: URL.createObjectURL(r.blob) }; } catch { return null; } }))).filter(Boolean), mr = null, syncMsg = '', authMsg = '';
const SK = [['talk', 'Talk'], ['listen', 'Listen'], ['speak', 'Speak'], ['write', 'Write']];
const speakView = () => `<div class="row seg" style="margin-bottom:8px">${SK.map(([k, t]) => `<button data-sk="${k}" aria-pressed="${sk === k}">${t}</button>`).join('')}</div>` + ({ talk: talkView, listen: listenView, speak: speakingView, write: writeView }[sk])();
const say = (texts, rate = 1) => { const ss = globalThis.speechSynthesis; if (!CAP.tts) return; ss.cancel(); for (const t of [].concat(texts)) { const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = rate; ss.speak(u); } };
const noTts = () => CAP.tts ? '' : '<p class="warn">Your browser has no speech synthesis, so audio cannot play here. Read the transcript instead.</p>';
// Listening: audio comes from the device text-to-speech voice (no recorded audio files are bundled).
function listenView() {
  if (!lsn) return head('Listening', "Sound is produced by your device's text-to-speech voice, not recorded human audio. Quality and accent depend on your device.") + noTts()
    + (listenL.map(l => li(`data-lnopen="${l.id}"`, l.level, `${esc(l.title)}${l.titleSo ? `<br><span class="mut">${esc(l.titleSo)}</span>` : ''}`, progLine(S.listen[l.id]))).join('') || '<p class="mut">No listening lessons loaded.</p>');
  const l = listenL.find(x => x.id === lsn.id), back = `<button class="back" data-lnback="1">${icon('back')}Back</button>`;
  if (lsn.i < 0) return `${back}<div class="card"><h2>${esc(l.title)}</h2>${l.titleSo ? `<p class="mut">${esc(l.titleSo)}</p>` : ''}<p class="mut">${l.level} · ${l.sentences.length} sentences</p>${noTts()}
    <div class="row player"><button class="p" data-lnplay="all" ${CAP.tts ? '' : 'disabled'}>${icon('play')}Play all</button><button data-lnstop="1">${icon('stop')}Stop</button><label>Speed <select id="lnrate" aria-label="Playback speed">${[0.6, 0.8, 1, 1.2].map(r => `<option value="${r}" ${lsn.rate === r ? 'selected' : ''}>${r}×</option>`).join('')}</select></label></div>
    <ol class="tr">${l.sentences.map((t, i) => `<li><button class="ib sm" data-lnplay="${i}" aria-label="Play sentence ${i + 1}" ${CAP.tts ? '' : 'disabled'}>${icon('play')}</button> ${lsn.tr ? `${esc(t)}${l.sentencesSo?.[i] ? `<br><span class="mut">${esc(l.sentencesSo[i])}</span>` : ''}` : '<span class="mut">hidden</span>'}</li>`).join('')}</ol>
    <button data-lntr="1" aria-pressed="${lsn.tr}">${lsn.tr ? 'Hide' : 'Show'} transcript</button> <button class="p" data-lnq="1">Questions (${l.questions.length})</button></div>`;
  if (lsn.i >= l.questions.length) { const r = scoreSession(lsn.res); return `${back}<div class="card flash"><h2>${r.correct}/${r.total} correct</h2><p>Accuracy ${Math.round(100 * r.accuracy)}%</p><button data-lnopen="${l.id}">Listen again</button></div>`; }
  const q = l.questions[lsn.i];
  if (lsn.fb) return `<p class="mut" style="margin:0">${lsn.i + 1} / ${l.questions.length}</p>${bar(Math.round(100 * lsn.i / l.questions.length))}<div class="card ${lsn.fb.ok ? 'fb-ok' : 'fb-bad'}" role="status"><h3>${lsn.fb.ok ? 'Correct' : 'Not quite'}</h3>${lsn.fb.ok ? '' : `<p>Answer: <b>${esc(q.type === 'mcq' ? q.options[q.answer] : q.answer)}</b></p>`}<p class="mut">${esc(q.explain ?? '')}</p>${q.explainSo ? `<p><b>Soomaali:</b> ${esc(q.explainSo)}</p>` : ''}<button class="p" data-lnnext="1">Next</button></div>`;
  return `<p class="mut" style="margin:0">${lsn.i + 1} / ${l.questions.length}</p>${bar(Math.round(100 * lsn.i / l.questions.length))}<div class="card"><div class="row"><button data-lnplay="all" ${CAP.tts ? '' : 'disabled'}>${icon('play')}Replay</button></div><h3>${esc(q.prompt)}${q.promptSo ? `<br><span class="mut">${esc(q.promptSo)}</span>` : ''}</h3>${q.type === 'mcq' ? q.options.map((o, k) => `<button class="opt" data-lna="${k}">${esc(o)}${q.optionsSo?.[k] ? `<br><span class="mut">${esc(q.optionsSo[k])}</span>` : ''}</button>`).join('') : '<input id="lnfill" aria-label="Answer" autocomplete="off"> <button class="p" id="lnsubmit">Check</button>'}</div>`;
}
async function lnAnswer(v) { const l = listenL.find(x => x.id === lsn.id), q = l.questions[lsn.i], ok = gradeAnswer(q, v); lsn.res.push({ id: lsn.i, correct: ok }); lsn.fb = { ok }; render(); }
async function lnNext() { const l = listenL.find(x => x.id === lsn.id); lsn.i++; lsn.fb = null;
  if (lsn.i >= l.questions.length) { S.listen = recordBest(S.listen, l.id, Math.round(100 * scoreSession(lsn.res).accuracy)); await repo.putMeta('listenProg', S.listen); await markStudied(); } render(); }
// Speaking: record, play back, compare by ear. Optional browser speech recognition reports recognised WORDS only.
const SPK = [...new Set(listenL.flatMap(l => l.sentences))].slice(0, 12);
function speakingView() {
  const t = SPK[sp.i] ?? '', done = S.speak.length, good = S.speak.filter(x => x.self === 'good').length;
  const chip = (l, ok, t) => `<span class="pill ${ok ? 'ok' : 'off'}">${l}: ${t}</span>`, caps = `<p class="chips">${chip('Recording', CAP.recording, CAP.recording ? 'supported' : 'not supported')}${chip('Speech playback', CAP.tts, CAP.tts ? 'supported' : 'not supported')}${chip('Speech recognition', CAP.recognition, CAP.recognition ? 'supported (browser-dependent)' : 'not supported')}${CAP.secure ? '' : '<span class="pill off">needs HTTPS for the microphone</span>'}</p>`;
  return head('Speaking', 'Listen, record, compare by ear.') + `<div class="card"><p class="mut"><b>No automatic pronunciation score.</b> Reliable scoring needs a speech-evaluation service. Here you listen, record yourself, play it back, and rate yourself honestly. ${CAP.recognition ? 'Optional recognition shows which words the browser heard.' : ''}</p>${caps}</div>
  ${SPK.length ? `<div class="card flash"><p class="mut">Repeat after me · ${sp.i + 1}/${SPK.length}</p><h2 style="font-size:1.5rem">${esc(t)}</h2>${sp.err ? `<p class="warn">${esc(sp.err)}</p>` : ''}
  <div class="row"><button data-spl="1" ${CAP.tts ? '' : 'disabled'}>${icon('speaker')}Listen</button><button data-spl="slow" ${CAP.tts ? '' : 'disabled'}>${icon('speaker')}Slow</button>${sp.rec ? `<button class="p" id="recstop">${icon('stop')}Stop</button>` : `<button class="p" id="rec" ${CAP.recording ? '' : 'disabled'}>${icon('mic')}Record</button>`}${CAP.recognition ? `<button id="rcg">${icon('mic')}Check words</button>` : ''}</div>
  ${sp.heard ? `<p>Heard: <i>${esc(sp.heard.text)}</i><br><span class="mut">${sp.heard.m.matched}/${sp.heard.m.total} target words recognised${sp.heard.m.missing.length ? ' · missing: ' + sp.heard.m.missing.map(esc).join(', ') : ''}. This is word recognition, not a pronunciation score.</span></p>` : ''}
  <div class="row" style="margin-top:8px"><button data-sp="-1" ${sp.i ? '' : 'disabled'}>${icon('back')}Prev</button><button data-sp="1" ${sp.i < SPK.length - 1 ? '' : 'disabled'}>Next${icon('next')}</button></div></div>` : '<p class="mut">No sentences loaded.</p>'}
  ${recs.length ? `<h3>Your recordings (saved on this device)</h3>${recs.map((r, i) => `<div class="card"><p class="mut">${esc(r.text)}</p><audio controls src="${r.url}"></audio><div class="row"><span class="mut">Self-rating:</span><button data-sr1="${i}:good">Matched the model</button><button data-sr1="${i}:work">Needs work</button><button data-spdel="${i}">Delete</button></div></div>`).join('')}` : ''}
  <p class="mut">Self-rated attempts: ${done} (${good} marked as matching). Recordings stay on this device (not synced to the cloud) and the newest 30 are kept.</p>`;
}
async function recStart() { sp.err = ''; try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks = []; mr = new MediaRecorder(stream); const text = SPK[sp.i];
    mr.ondataavailable = e => e.data.size && chunks.push(e.data); mr.onstop = () => { stream.getTracks().forEach(x => x.stop()); const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), r = { id: crypto.randomUUID(), blob, text, at: Date.now() }; repo.putRecording(r).catch(() => {}); recs.push({ ...r, url: URL.createObjectURL(blob) }); recs = recs.slice(-30); sp.rec = false; render(); }; mr.start(); sp.rec = true; }
  catch (e) { sp.err = e?.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow it in your browser/site settings and try again.' : e?.name === 'NotFoundError' ? 'No microphone found.' : 'Could not start recording: ' + (e?.message ?? e); } render(); }
function recognise() { const R = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition; if (!R) return; const r = new R(); r.lang = 'en-US'; r.maxAlternatives = 1;
  r.onresult = e => { const text = e.results[0][0].transcript; sp.heard = { text, m: wordMatch(SPK[sp.i], text) }; render(); }; r.onerror = e => { sp.err = 'Recognition failed: ' + (e.error || 'unknown'); render(); }; try { r.start(); } catch { sp.err = 'Recognition could not start.'; render(); } }
async function selfRate(i, v) { const r = recs[i]; S.speak = [...S.speak, { at: r.at, text: r.text, self: v }].slice(-500); await repo.putMeta('speakLog', S.speak); await markStudied(); render(); }
// Writing: deterministic rule checks only. Not AI, not a grade of quality.
function writeView() {
  if (!wr) return head('Writing', 'Feedback comes from fixed rules (length, capitals, punctuation, register, required words, a few common errors). It cannot judge ideas, style or full grammar.')
    + writeP.map(w => li(`data-wopen="${w.id}"`, w.level, `${esc(w.title)} <span class="mut">(${w.kind})</span><br><span class="mut">${esc(w.titleSo ?? '')}</span>`, `${S.write.filter(x => x.id === w.id).length} submission(s)`)).join('')
    + (S.write.length ? `<h3>History</h3>${S.write.slice(-5).reverse().map(x => `<div class="card">${esc(x.title)} <span class="mut">${new Date(x.at).toLocaleDateString()} · ${x.words} words · ${x.passed ? 'all checks passed' : x.issues + ' issue(s)'}</span></div>`).join('')}` : '');
  const w = writeP.find(x => x.id === wr.id), o = wr.out;
  return `<button class="back" data-wback="1">${icon('back')}Back</button><div class="card"><h2>${esc(w.title)}</h2>${w.titleSo ? `<p class="mut">${esc(w.titleSo)}</p>` : ''}<p>${esc(w.prompt)}</p>${w.promptSo ? `<p class="mut"><b>Af-Soomaali:</b> ${esc(w.promptSo)}</p>` : ''}<p class="mut">${w.minWords}–${w.maxWords ?? '∞'} words${w.required?.length ? ' · use: ' + w.required.map(esc).join(', ') : ''}</p>
  <textarea id="wtext" rows="8" aria-label="Your writing" style="width:100%">${esc(wr.text)}</textarea><button class="p" id="wcheck">Check with rules</button></div>
  ${o ? `<div class="card ${o.issues.length ? 'fb-bad' : 'fb-ok'}" role="status"><h3>Rule-based feedback <span class="mut">(not AI)</span></h3><p class="mut">${o.words} words</p>${o.issues.length ? `<ul class="ex">${o.issues.map(i => `<li>${esc(i.msg)}</li>`).join('')}</ul>` : '<p>No rule problems found. This does not mean the text is perfect.</p>'}
  ${o.hints.length ? `<p><b>Grammar patterns spotted:</b></p><ul>${o.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}${o.vocab.length ? `<p><b>Word choice ideas:</b></p><ul>${o.vocab.map(v => `<li>${esc(v.word)} → ${v.try.map(esc).join(', ')}</li>`).join('')}</ul>` : ''}
  ${w.model ? `<p class="mut">Model answer: ${esc(w.model)}</p>${w.modelSo ? `<p class="mut"><b>Tusaale Soomaali ah:</b> ${esc(w.modelSo)}</p>` : ''}` : ''}</div>` : ''}`;
}
async function wCheck() { const w = writeP.find(x => x.id === wr.id), r = checkWriting(wr.text, { minWords: w.minWords, maxWords: w.maxWords, required: w.required, formal: w.formal });
  wr.out = { words: r.wordCount, issues: r.issues, hints: grammarHints(wr.text), vocab: suggestVocab(wr.text) };
  S.write = [...S.write, { at: Date.now(), id: w.id, title: w.title, words: r.wordCount, issues: r.issues.length + wr.out.hints.length, passed: r.passed && !wr.out.hints.length, text: wr.text.slice(0, 3000) }].slice(-200);
  await repo.putMeta('writeLog', S.write); await markStudied(); render(); }
async function exportBackup() {
  try { const meta = {}; for (const k of META_KEYS) meta[k] = await repo.meta(k, undefined);
    const b = buildBackup({ cards: Object.values(S.cards), meta, alarms: await repo.alarms(), challenges: await repo.challenges() }), blob = new Blob([JSON.stringify(b)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `fluentup-backup-${dayKey(new Date())}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    S.lastBackup = Date.now(); await repo.setMeta('lastBackup', S.lastBackup); bkMsg = `Backup of ${b.cards.length} cards downloaded.`; }
  catch (e) { bkMsg = 'Could not create the backup: ' + (e?.message ?? e); } render(); }
async function importBackup(file) {
  if (!file) return; let text; try { text = await file.text(); } catch { bkMsg = 'Could not read that file.'; return render(); }
  const r = parseBackup(text); if (!r.ok) { bkMsg = r.error; return render(); }
  try { let upd = 0;
    for (const inc of r.data.cards) { const cur = S.cards[inc.id], keep = pickCard(cur, inc); if (keep !== cur) { S.cards[inc.id] = await repo.saveCard(keep); upd++; } }
    for (const [k, v] of Object.entries(r.data.meta)) { const key = k === 'tsize' || k === 'theme' ? null : k, local = await repo.meta(k, undefined), merged = mergeMetaValue(k, local, v);
      if (JSON.stringify(merged) !== JSON.stringify(local)) { if (key) await repo.putMeta(k, merged); else await repo.setMeta(k, merged); } }
    for (const a of r.data.alarms) if (!S.alarms.some(x => x.id === a.id)) { await repo.putAlarm(a); S.alarms.push(a); }
    const have = new Set((await repo.challenges()).map(c => c.id)); for (const c of r.data.challenges) if (!have.has(c.id)) { await repo.putChallenge(c); S.challenges.push(c); }
    S.days = await repo.meta('days', []); S.saved = await repo.meta('saved', []); S.rest = await repo.meta('rest', []); S.lp = await repo.meta('lessonProg', {}); S.cp = await repo.meta('convoProg', {}); S.listen = await repo.meta('listenProg', {}); S.speak = await repo.meta('speakLog', []); S.write = await repo.meta('writeLog', []); S.mist = await repo.meta('lessonMist', []); S.tlog = await repo.meta('timeLog', []); S.rh = await repo.meta('readHist', []); S.lsaved = await repo.meta('lessonSaved', []); S.goal = await repo.meta('goal', { vocab: 5 }); S.prof = await repo.meta('profile', {}); S.notif = await repo.meta('notif', { snooze: 10 }); S.recent = await repo.meta('recent', []); S.tsize = await repo.meta('tsize', 'md'); S.theme = await repo.meta('theme', 'system'); applyTheme();
    bkMsg = `Restored: ${upd} card(s) updated, ${r.data.cards.length - upd} already up to date${r.skipped ? `, ${r.skipped} unreadable card(s) skipped` : ''}.`; }
  catch (e) { bkMsg = 'Restore stopped part-way: ' + (e?.message ?? e) + ' Nothing was deleted; you can try again.'; } render(); }
// ---- Click router for the modules above (returns true when handled) -------------------------
async function xclick(t, d) {
  if (await tutor.click(t, d)) return true;
  if (t.id === 'bkexp') { await exportBackup(); return true; }
  if (d.sk) { sk = d.sk; render(); return true; }
  if (d.mist) { tab = 'library'; lib.mode = 'grammar'; lib.detail = null; lrun = { id: '__mist', i: -1, res: [], fb: null }; render(); return true; }
  if (d.bd) { S.banner = null; render(); return true; }
  if (d.snz) { const m = S.banner; S.banner = null; setTimeout(() => { S.banner = m; if (globalThis.Notification?.permission === 'granted') new Notification(m); render(); }, S.notif.snooze * 60000); render(); return true; }
  if (d.lnopen) { lsn = { id: d.lnopen, i: -1, res: [], fb: null, tr: false, rate: 1 }; render(); return true; }
  if (d.lnback) { globalThis.speechSynthesis?.cancel?.(); lsn = null; render(); return true; }
  if (d.lnplay) { const l = listenL.find(x => x.id === lsn.id); say(d.lnplay === 'all' ? l.sentences : l.sentences[+d.lnplay], lsn.rate); return true; }
  if (d.lnstop) { globalThis.speechSynthesis?.cancel?.(); return true; }
  if (d.lntr) { lsn.tr = !lsn.tr; render(); return true; }
  if (d.lnq) { lsn.i = 0; render(); return true; }
  if (d.lna) { await lnAnswer(+d.lna); return true; } if (t.id === 'lnsubmit') { await lnAnswer(document.getElementById('lnfill').value); return true; }
  if (d.lnnext) { await lnNext(); return true; }
  if (d.spl) { say(SPK[sp.i], d.spl === 'slow' ? 0.6 : 1); return true; }
  if (t.id === 'rec') { await recStart(); return true; } if (t.id === 'recstop') { mr?.state === 'recording' && mr.stop(); return true; }
  if (t.id === 'rcg') { recognise(); return true; }
  if (d.sp) { sp.i = Math.min(SPK.length - 1, Math.max(0, sp.i + +d.sp)); sp.heard = null; sp.err = ''; render(); return true; }
  if (d.sr1) { const [i, v] = d.sr1.split(':'); await selfRate(+i, v); return true; }
  if (d.spdel) { if (!await confirmSheet({ title: 'Delete recording?', body: 'This recording will be removed from this device.' })) return true; const r = recs[+d.spdel]; URL.revokeObjectURL?.(r.url); await repo.delRecording(r.id); recs.splice(+d.spdel, 1); render(); return true; }
  if (d.wopen) { wr = { id: d.wopen, text: '', out: null }; render(); return true; } if (d.wback) { wr = null; render(); return true; }
  if (t.id === 'wcheck') { wr.text = document.getElementById('wtext').value; await wCheck(); return true; }
  if (t.id === 'obsave') { const lv = document.getElementById('obl').value, g = +document.getElementById('obg').value; S.prof = { name: document.getElementById('obn').value.trim().slice(0, 80), level: LEVELS.includes(lv) ? lv : 'A1', onboarded: true };
    if (Number.isInteger(g) && g >= 1 && g <= 500) { S.goal = { vocab: g }; await repo.putMeta('goal', S.goal); } await repo.putMeta('profile', S.prof); if (S.prof.level) { lib.level = ''; lib.gl = S.prof.level; } render(); return true; }
  if (t.id === 'obskip') { S.prof = { ...S.prof, onboarded: true }; await repo.putMeta('profile', S.prof); render(); return true; }
  if (d.ow !== undefined) { (lrun.sel ??= []).push(+d.ow); render(); return true; } if (d.ou) { lrun.sel?.pop(); render(); return true; }
  if (d.ok) { const q = getL(lrun.id).exercises[lrun.i]; await lanswer((lrun.sel ?? []).map(i => q.words[i])); return true; }
  if (t.id === 'authmode') { authMode = authMode === 'signin' ? 'signup' : 'signin'; authStep = 'credentials'; authMsg = ''; authPasswordVisible = false; render(); return true; }
  if (t.id === 'togglepassword') {
    authPasswordVisible = !authPasswordVisible;
    const field = document.getElementById('pw');
    if (field) field.type = authPasswordVisible ? 'text' : 'password';
    t.setAttribute('aria-label', authPasswordVisible ? 'Qari password-ka' : 'Muuji password-ka');
    t.setAttribute('aria-pressed', String(authPasswordVisible));
    t.innerHTML = authPasswordVisible ? icon('close') : icon('eye');
    t.classList.toggle('is-visible', authPasswordVisible);
    return true;
  }
  if ((t.id === 'signin' || t.id === 'signup') && !authBusy) {
    const em = document.getElementById('em').value.trim().toLowerCase(), pw = document.getElementById('pw').value;
    const nm = t.id === 'signup' ? document.getElementById('authname').value.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
    authEmail = em; if (t.id === 'signup') authName = nm;
    if (t.id === 'signup' && nm.length < 2) { authMsg = 'Fadlan geli magacaaga (ugu yaraan 2 xaraf).'; render(); return true; }
    if (!/^[^\s@]+@gmail\.com$/i.test(em)) { authMsg = 'Fadlan isticmaal Gmail sax ah (@gmail.com).'; render(); return true; }
    if (pw.length < 8) { authMsg = 'Password-ku waa inuu ahaadaa ugu yaraan 8 xaraf.'; render(); return true; }
    authBusy = true; authMsg = ''; render();
    try {
      if (t.id === 'signup') {
        const j = await sb.signUp(em, pw, nm); authEmail = em; authName = nm;
        if (j.access_token) {
          // Email confirmation must be enabled in Supabase; never accept a signup session without OTP.
          await sb.signOut();
          authStep = 'credentials';
          authMsg = 'Supabase Email Confirm ma shidna. Daar Email confirmation si OTP loo khasbo, kadib mar kale is diiwaangeli.';
        } else { authStep = 'verify'; authMsg = 'Code xaqiijin ah ayaa Gmail-kaaga loo diray.'; }
      } else { await sb.signIn(em, pw); location.reload(); return true; }
    } catch (e) { authMsg = 'Wuu fashilmay: ' + e.message; }
    finally { authBusy = false; }
    render(); return true;
  }
  if (t.id === 'verifycode' && !authBusy) {
    const code = document.getElementById('vcode').value.trim();
    if (!/^\d{6}$/.test(code)) { authMsg = 'Geli code-ka 6 lambar ah.'; render(); return true; }
    authBusy = true; authMsg = ''; render();
    try { await sb.verifyOtp(authEmail, code); location.reload(); return true; }
    catch (e) { authMsg = 'Code-ku ma shaqaynayo: ' + e.message; }
    finally { authBusy = false; }
    render(); return true;
  }
  if (t.id === 'backauth') { authStep = 'credentials'; authMode = 'signup'; authMsg = ''; render(); return true; }
  if (t.id === 'recover') { const em = document.getElementById('em').value.trim().toLowerCase(); authEmail = em; try { await sb.recover(em); authMsg = 'Haddii Gmail-ku account leeyahay, fariin soo kabasho ayaa loo diray.'; } catch (e) { authMsg = 'Wuu fashilmay: ' + e.message; } render(); return true; }
  if (t.id === 'signout') { await sb.signOut(); tutor.reset(); location.reload(); return true; }
  if (t.id === 'syncnow') { await doSync(); render(); return true; }
  return false;
}
async function pullRemote() { const pl = await sb.pull(), ch = await repo.mergeRemote(pl.meta); await repo.mergeCards(pl.cards);
  if (ch.includes('syncChallenges')) await repo.replaceList('challenges', await repo.meta('syncChallenges', [])); if (ch.includes('syncAlarms')) await repo.replaceList('alarms', await repo.meta('syncAlarms', []));
  for (const c of await repo.cards()) S.cards[c.id] = c; S.challenges = await repo.challenges(); S.alarms = await repo.alarms();
  const m = async (k, d) => repo.meta(k, d); Object.assign(S, { days: await m('days', []), goal: await m('goal', { vocab: 5 }), saved: await m('saved', []), rest: await m('rest', []), lp: await m('lessonProg', {}), cp: await m('convoProg', {}), listen: await m('listenProg', {}), speak: await m('speakLog', []), write: await m('writeLog', []), mist: await m('lessonMist', []), prof: await m('profile', {}), rh: await m('readHist', []), lsaved: await m('lessonSaved', []) }); arm(); }
async function doSync() { if (!sb?.signedIn()) { syncMsg = 'Sign in first.'; return; } if (!navigator.onLine) { syncMsg = 'Offline: changes stay queued.'; return; }
  try { const r = await repo.sync(sb.send); await pullRemote(); pending = (await repo.pending()).length; syncMsg = `Last sync: ${r.sent} sent, ${r.failed} failed (will retry), ${r.conflicts.length} conflict(s) resolved by newest change.`; } catch (e) { syncMsg = 'Sync error: ' + e.message; } }
// ---- Me: profile, analytics, account, settings ----------------------------------------------
const bars = (arr0, k, label) => { const arr = arr0.map(x => x.date ? x : { ...x, date: x.month + '-01' }), mx = Math.max(1, ...arr.map(x => x[k])); return `<div class="chart" role="img" aria-label="${label}: ${arr.map(x => `${x.date.slice(5)} ${x[k]}`).join(', ')}">${arr.map(x => `<div class="bar"><b>${x[k]}</b><i style="height:${Math.round(60 * x[k] / mx)}px"></i><small>${x.date.slice(8)}</small></div>`).join('')}</div>`; };
function monthWeekView(t) { const mo = monthly(cards(), S.tlog, S.days, t, 6), wk = weekly(cards(), S.tlog, S.days, t, 4), best = streakHistory(S.days, S.rest);
  return `<div class="card"><b>Weekly</b><table class="tbl"><tr><th>Week ending</th><th>Reviews</th><th>Accuracy</th><th>Min</th><th>Days</th></tr>${wk.map(w => `<tr><td>${w.end.slice(5)}</td><td>${w.reviews}${w.trend === null ? '' : ` <span class="mut">(${w.trend > 0 ? '+' : ''}${w.trend}%)</span>`}</td><td>${w.accuracy === null ? '–' : w.accuracy + '%'}</td><td>${w.minutes}</td><td>${w.studyDays}</td></tr>`).join('')}</table>
  <b>Monthly</b><table class="tbl"><tr><th>Month</th><th>Reviews</th><th>Accuracy</th><th>Min</th><th>Days</th></tr>${mo.map(m => `<tr><td>${m.month}</td><td>${m.reviews}</td><td>${m.accuracy === null ? '–' : m.accuracy + '%'}</td><td>${m.minutes}</td><td>${m.studyDays}</td></tr>`).join('')}</table>${bars(mo, 'reviews', 'Reviews per month')}<p class="mut">Longest streak: ${best} day(s). Computed from stored review history and study days only; vocabulary reviews, not other skills.</p></div>`; }
function meView() { const all = cards().flatMap(c => c.history), right = all.filter(h => h.grade >= 3).length, hard = cards().filter(c => c.lapses > 0).sort((a, b) => b.lapses - a.lapses).slice(0, 5), t = today();
  const sk2 = skills({ lp: S.lp, cp: S.cp, listen: S.listen, speak: S.speak, write: S.write, cards: cards(), lessons }), pct = v => v === null ? 'no data yet' : v + '% avg best';
  const minutes = studyMinutes(S.tlog, t, 7), totalMin = S.tlog.reduce((a, x) => a + x.ms, 0) / 60000;
  return `<h1>Progress</h1><div class="stats"><div class="stat"><b>${all.length}</b><small>reviews</small></div><div class="stat"><b>${all.length ? Math.round(100 * right / all.length) + '%' : 'n/a'}</b><small>accuracy</small></div><div class="stat"><b>${S.saved.length}</b><small>saved</small></div></div><p class="sr">${all.length} reviews · accuracy ${all.length ? Math.round(100 * right / all.length) + '%' : 'n/a'} · ${S.saved.length} saved</p><h2>Profile</h2>
  <div class="card">${S.prof.name ? esc(S.prof.name) + ' · ' : ''}level ${S.prof.level ?? 'not set'} · streak ${streak(S.days, t, S.rest)} day(s) · ${Math.round(totalMin)} min active study time (measured while you tap; idle gaps over 2 min are not counted)</div>
  <h2>Analytics</h2><div class="card"><b>Reviews, last 7 days</b>${bars(dailyReviews(cards(), t, 7), 'count', 'Reviews per day')}<b>Mistakes, last 7 days</b>${bars(mistakeTrend(cards(), t, 7), 'mistakes', 'Mistakes per day')}<b>Study minutes, last 7 days</b>${bars(minutes, 'minutes', 'Minutes per day')}</div>
  ${monthWeekView(t)}
  <div class="card"><b>Skills</b><ul class="skills"><li>Vocabulary: ${sk2.vocabulary.reviews} reviews, ${sk2.vocabulary.mastered} mastered${sk2.vocabulary.accuracy !== null ? ', ' + sk2.vocabulary.accuracy + '% correct' : ''}</li><li>Grammar: ${sk2.grammar.lessons} lessons tried, ${pct(sk2.grammar.avg)}</li><li>Reading: ${sk2.reading.lessons} passages, ${pct(sk2.reading.avg)}</li><li>Professional: ${sk2.professional.lessons} lessons, ${pct(sk2.professional.avg)}</li><li>Conversation: ${sk2.conversation.played} played, ${pct(sk2.conversation.avg)}</li><li>Listening: ${sk2.listening.done} done, ${pct(sk2.listening.avg)}</li><li>Speaking: ${sk2.speaking.attempts} self-rated attempts</li><li>Writing: ${sk2.writing.submissions} submissions, ${sk2.writing.passedFirstTry} passed all rule checks</li></ul></div>
  <h2>Mistakes to revisit</h2>${hard.map(c => `<div class="card">${esc(byId.get(c.id).en)} <span class="mut">missed ${c.lapses}×</span></div>`).join('') || '<p class="mut">No mistakes yet.</p>'}${S.mist.length ? `<div class="card">${S.mist.length} grammar exercise(s) answered wrongly. <button data-mist="1">Practise them</button></div>` : ''}
  <h2>Back up &amp; restore</h2><div class="card"><p class="mut">Your progress lives only on this device unless you sync. Save a backup file now and then; restoring merges it with what you have and never deletes newer progress. Speaking recordings are not included.</p><div class="row"><button class="p" id="bkexp">Download backup</button><label class="chip" for="bkimp">Restore from file</label><input id="bkimp" type="file" accept="application/json,.json" class="sr"></div>${bkMsg ? `<p role="status" class="${/^(Restored|Backup of)/.test(bkMsg) ? 'pill ok' : 'warn'}">${esc(bkMsg)}</p>` : ''}</div>
  <h2>Account &amp; sync</h2><div class="card">${!sb ? '<p class="mut">Cloud sync is not configured. Copy <code>config.example.js</code> to <code>config.js</code> and add your Supabase URL and anon key. Everything works offline without it.</p>'
    : sb.signedIn() ? `<p>Signed in as ${esc(sb.user()?.email ?? 'your account')}</p><div class="row"><button class="p" id="syncnow">Sync now</button><button id="signout">Sign out</button></div>`
    : '<input id="em" type="email" autocomplete="email" placeholder="Email" aria-label="Email"> <input id="pw" type="password" autocomplete="current-password" placeholder="Password (8+ chars)" aria-label="Password"><div class="row" style="margin-top:8px"><button class="p" id="signin">Sign in</button><button id="signup">Sign up</button><button id="recover">Forgot password</button></div>'}
    <p class="mut">${authMsg ? esc(authMsg) + ' · ' : ''}${navigator.onLine ? 'Online' : 'Offline'} · ${pending} change(s) waiting to sync${syncMsg ? ' · ' + esc(syncMsg) : ''}</p></div>
  <h2 id="settings">Settings</h2><div class="card"><p class="mut" style="margin:0 0 6px">Text size</p>${LiquidGlassTab([['sm', 'Small'], ['md', 'Default'], ['lg', 'Large'], ['xl', 'XL']], S.tsize ?? 'md', 'data-setk="tsz" data-setv')}<p class="mut" style="margin:14px 0 6px">Theme</p>${LiquidGlassTab([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], S.theme, 'data-setk="th" data-setv')}
  <p class="mut" style="margin:14px 0 6px">Snooze</p>${LiquidGlassTab([5, 10, 15, 30].map(v => [v, v + ' min']), S.notif.snooze, 'data-setk="snz" data-setv')}
  <p class="mut">${nativeAvailable() ? (S.nat?.denied ? 'Notification permission was denied: enable it in Android settings.' : S.nat?.scheduled !== undefined ? `Background reminders scheduled on this device: ${S.nat.scheduled}.` : 'Checking reminders…') : 'In a browser, reminders fire only while the app is open. Background reminders work in the Android app (see docs/ANDROID.md).'}</p></div>`; }
function arm() { timers.forEach(clearTimeout); timers = []; syncNative(S.alarms).then(r => { S.nat = r; }).catch(() => {});
  for (const a of S.alarms) { const n = nextAlarm(a), ms = n && n - Date.now(); if (ms > 0 && ms < 2 ** 31 - 1) timers.push(setTimeout(() => { const m = `FluentUp: ${a.label || 'time to learn'}`; S.banner = m; if (globalThis.Notification?.permission === 'granted') new Notification(m); else if (!globalThis.document?.hidden) { /* banner shown in-app */ } else alert(m); render(); arm(); }, ms)); } }
let lastSig = '', lastTab = ''; const NAV = ['home', 'library', 'speak', 'quiz', 'plan', 'me'];
function authView() {
  document.querySelector('nav')?.classList?.add?.('auth-hidden');
  document.querySelector('.topbar')?.classList?.add?.('auth-hidden');
  if (!sb) return `<section class="auth-wrap"><div class="auth-card"><div class="auth-mark">N</div><div class="auth-brand">NORA</div><h1>Ku soo dhowow NORA</h1><p class="auth-sub">Barashada English-ka, adiga kuu gaar ah.</p><div class="auth-alert">Si ammaan ah u gal NORA: ku dar <code>SUPABASE_URL</code> iyo <code>SUPABASE_ANON_KEY</code> gudaha <code>config.js</code>. Login demo ah lama oggola.</div></div></section>`;
  const verify = authStep === 'verify';
  return `<section class="auth-wrap"><div class="auth-card"><div class="auth-mark">N</div><div class="auth-brand">NORA</div>
    <div class="auth-eyebrow">YOUR PERSONAL LEARNING SPACE</div><h1>${verify ? 'Xaqiiji Gmail-kaaga' : authMode === 'signup' ? 'Sameyso account' : 'Ku soo dhowow'}</h1>
    <p class="auth-sub">${verify ? `Code-ka 6-da lambar ah ee loo diray ${esc(authEmail)} geli.` : authMode === 'signup' ? 'Magacaaga iyo Gmail-kaaga ku sameyso account ammaan ah.' : 'Gal account-kaaga si aad u sii wadato barashada.'}</p>
    ${verify ? `<label class="auth-label" for="vcode">Verification code</label><input id="vcode" class="auth-input auth-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"><button class="auth-primary" id="verifycode" ${authBusy ? 'disabled' : ''}>${authBusy ? 'Waa la xaqiijinayaa…' : 'Xaqiiji oo gal'} <span>→</span></button><button class="auth-link" id="backauth">Ku noqo</button>` : `${authMode === 'signup' ? `<label class="auth-label" for="authname">Magacaaga</label><input id="authname" class="auth-input" type="text" autocomplete="name" maxlength="80" placeholder="Magacaaga oo buuxa" value="${esc(authName)}">` : ''}
    <label class="auth-label" for="em">Gmail</label><input id="em" class="auth-input" type="email" autocomplete="email" placeholder="magaca@gmail.com" value="${esc(authEmail)}">
    <label class="auth-label" for="pw">Password</label><div class="auth-password"><input id="pw" class="auth-input" type="${authPasswordVisible ? 'text' : 'password'}" autocomplete="${authMode === 'signup' ? 'new-password' : 'current-password'}" placeholder="Ugu yaraan 8 xaraf"><button type="button" class="auth-eye ${authPasswordVisible ? 'is-visible' : ''}" id="togglepassword" aria-label="${authPasswordVisible ? 'Qari password-ka' : 'Muuji password-ka'}" aria-pressed="${authPasswordVisible}">${icon(authPasswordVisible ? 'eye-off' : 'eye')}</button></div>
    ${authMode === 'signin' ? `<button class="auth-forgot" id="recover">Password ma illowday?</button>` : `<p class="auth-hint">Code xaqiijin ah ayaa Gmail-kaaga laguugu soo diri doonaa.</p>`}
    <button class="auth-primary" id="${authMode}" ${authBusy ? 'disabled' : ''}>${authBusy ? 'Fadlan sug…' : authMode === 'signup' ? 'Samee account' : 'Login'} <span>→</span></button><div class="auth-switch">${authMode === 'signup' ? 'Hore account ma u leedahay?' : 'Account ma lihid?'} <button id="authmode">${authMode === 'signup' ? 'Login' : 'Is diiwaangeli'}</button></div>`}
    ${authMsg ? `<p class="auth-message" role="status">${esc(authMsg)}</p>` : ''}<div class="auth-foot"><span>🔒</span> Akoonkaaga iyo horumarkaagu waa kuu gaar</div>
  </div><p class="auth-copy">NORA · LEARN ENGLISH, NATURALLY</p></section>`;
}
function render() {
  if (!sb || !sb.signedIn()) { app.innerHTML = authView(); return; }
  document.querySelector('nav')?.classList?.remove?.('auth-hidden'); document.querySelector('.topbar')?.classList?.remove?.('auth-hidden');
  if (tab === 'tutor') tutor.beforeRender();
  app.innerHTML = (S.banner ? `<div class="card banner" role="alert">${esc(S.banner)} <button data-snz="1">Snooze ${S.notif.snooze} min</button> <button data-bd="1">Dismiss</button></div>` : '') + { home, review: reviewView, library: libraryView, me: meView, quiz: quizView, speak: speakView, plan: planView, tutor: tutor.view }[tab]();
  const net = document.getElementById('net'); if (net) { net.textContent = navigator.onLine ? 'Online' : 'Offline'; net.className = 'pill ' + (navigator.onLine ? 'ok' : 'off'); }
  const sig = [tab, lib.mode, lib.detail, lrun?.id, lrun?.i, quiz?.i, sk, showAns, !!S.banner].join('|'); if (sig !== lastSig) { lastSig = sig; enter(app); if (tab !== lastTab) globalThis.scrollTo?.(0, 0); lastTab = tab; }
  setNav(tab, NAV); document.querySelector('nav')?.classList?.toggle?.('nopill', tab === 'tutor'); document.getElementById('tbTutor')?.setAttribute?.('aria-pressed', String(tab === 'tutor'));
  if (tab === 'tutor') { tutor.afterRender(); if (tutor.needsLoad()) tutor.load().then(() => render()); }
  document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-current', b.dataset.t === tab));
}
document.querySelector('nav').onclick = e => { const nb = e.target.closest?.('button') ?? e.target; if (nb.dataset?.t) { tab = nb.dataset.t; showAns = false; lib.detail = null; render(); } };
const flashAns = async (btn, ok) => { if (!btn?.classList || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return; btn.classList.add(ok ? 'is-ok' : 'is-bad'); app.querySelectorAll?.('.opt').forEach(b => { b.disabled = true; }); await new Promise(r => setTimeout(r, 420)); };
async function answer(a, btn) { const q = quiz.qs[quiz.i], ok = gradeAnswer(q, a); await flashAns(btn, ok); quiz.res.push({ id: q.id, correct: ok }); await grade(q.id, ok ? 4 : 1); quiz.i++; render(); }
app.onclick = async e => { const t = e.target.closest?.('button, input') ?? e.target, d = t.dataset; await tick(); if (d.setk) { const v = d.setv; if (d.setk === 'snz') { S.notif = { ...S.notif, snooze: +v }; await repo.setMeta('notif', S.notif); } else if (d.setk === 'tsz') { S.tsize = v; await repo.setMeta('tsize', v); applyTheme(); } else { S.theme = v; await repo.setMeta('theme', v); applyTheme(); } render(); return; } if (await xclick(t, d)) return; if (t.id === 'show') { showAns = true; render(); }
  else if (d.g) { const c = dueCards(cards())[0]; await grade(c.id, +d.g); showAns = false; render(); }
  else if (t.id === 'start') { quiz = { qs: buildQuiz(entries, { count: 5, seed: Date.now() }), i: 0, res: [] }; render(); }
  else if (d.o) await answer(+d.o, t);
  else if (t.id === 'submit') await answer(document.getElementById('fill').value);
  else if (d.t) { tab = d.t; showAns = false; render(); }
  else if (d.sr) { const [k, ...r] = d.sr.split(':'), id = r.join(':'); S.recent = pushRecent(S.recent, gq); await repo.setMeta('recent', S.recent);
    if (k === 'entry') { lib.mode = 'library'; lib.detail = id; tab = 'library'; }
    else if (k === 'lesson') { lib.mode = lessons.find(x => x.id === id).track ?? 'grammar'; lib.detail = null; lrun = { id, i: -1, res: [], fb: null }; tab = 'library'; }
    else if (k === 'listen') { tab = 'speak'; sk = 'listen'; lsn = { id, i: -1, res: [], fb: null, tr: false, rate: 1 }; }
    else if (k === 'write') { tab = 'speak'; sk = 'write'; wr = { id, text: '', out: null }; }
    else { tab = 'speak'; sk = 'talk'; crun = { c: id, st: begin(convos.find(x => x.id === id)) }; } render(); }
  else if (d.rq) { gq = d.rq; render(); }
  else if (d.lm) { lib.mode = d.lm; lib.lbm = false; render(); }
  else if (d.ls) { lrun = { id: d.ls, i: -1, res: [], fb: null }; render(); }
  else if (d.lstart) { lrun.i = 0; render(); }
  else if (d.lbm) { S.lsaved = toggle(S.lsaved, d.lbm); await repo.putMeta('lessonSaved', S.lsaved); render(); }
  else if (d.lbmf) { lib.lbm = !lib.lbm; render(); }
  else if (d.lback) { lrun = null; render(); }
  else if (d.lo) { t.classList?.add('is-pick'); await lanswer(+d.lo); }
  else if (t.id === 'lsubmit') await lanswer(document.getElementById('lfill').value);
  else if (d.lnext) await lnext();
  else if (d.cs) { crun = { c: d.cs, st: begin(convos.find(x => x.id === d.cs)) }; render(); }
  else if (d.cc) { await cchoose(+d.cc); }
  else if (d.cback) { crun = null; render(); }
  else if (d.open) { lib.detail = d.open; render(); }
  else if (d.back) { lib.detail = null; render(); }
  else if (d.bm) { S.saved = toggle(S.saved, d.bm); await repo.putMeta('saved', S.saved); render(); }
  else if (d.more) { lib.page++; render(); }
  else if (d.cal) { const m = cal.m + +d.cal; cal = { y: cal.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; render(); }
  else if (t.id === 'restToggle') { S.rest = toggle(S.rest, today()); await repo.putMeta('rest', S.rest); render(); }
  else if (d.ch) await startChallenge(+d.ch);
  else if (t.id === 'cc') { const n = +document.getElementById('cd').value; if (Number.isInteger(n) && n >= 1 && n <= 3650) await startChallenge(n); }
  else if (d.cp) { const i = S.challenges.findIndex(x => x.id === d.cp), c = S.challenges[i]; S.challenges[i] = c.pausedFrom ? resumeChallenge(c, today()) : pauseChallenge(c, today()); await repo.putChallenge(S.challenges[i]); render(); }
  else if (d.rc) { if (!await confirmSheet({ title: 'Delete challenge?', body: 'Your streak and study days are kept.' })) return; await repo.delChallenge(d.rc); S.challenges = S.challenges.filter(x => x.id !== d.rc); render(); }
  else if (t.id === 'setGoal') { const n = +document.getElementById('gv').value; if (Number.isInteger(n) && n >= 1 && n <= 500) { S.goal = { vocab: n }; await repo.putMeta('goal', S.goal); render(); } }
  else if (t.id === 'addAlarm') {
    const [h, m] = document.getElementById('at').value.split(':').map(Number); if (Number.isNaN(h)) return;
    const a = { id: crypto.randomUUID(), hour: h, minute: m, label: document.getElementById('al').value.trim(), days: [...document.querySelectorAll('input[name=d]:checked')].map(x => +x.value), enabled: true, updatedAt: Date.now() };
    await repo.putAlarm(a); S.alarms.push(a); globalThis.Notification?.requestPermission?.(); applyTheme(); arm(); render(); initGlass();
const tbS = document.getElementById('tbSearch'), tbG = document.getElementById('tbSettings');
if (tbS) tbS.onclick = () => { tab = 'library'; lib.mode = 'search'; lib.detail = null; render(); document.getElementById('gq')?.focus?.(); };
if (tbG) tbG.onclick = () => { tab = 'me'; lib.detail = null; render(); document.getElementById('settings')?.scrollIntoView?.({ behavior: 'smooth' }); };
  } else if (d.tg) { const a = S.alarms.find(x => x.id === d.tg); a.enabled = !a.enabled; a.updatedAt = Date.now(); await repo.putAlarm(a); arm(); render(); }
  else if (d.rm) { if (!await confirmSheet({ title: 'Delete reminder?', body: 'It will stop firing.' })) return; await repo.delAlarm(d.rm); S.alarms = S.alarms.filter(x => x.id !== d.rm); arm(); render(); } };
app.oninput = e => { if (e.target.id === 'tin') { tutor.onInput(e.target); return; } if (e.target.id === 'wtext') { wr.text = e.target.value; return; } if (e.target.id === 'gq') { gq = e.target.value; const p = e.target.selectionStart; app.innerHTML = libraryView(); const i = document.getElementById('gq'); i.focus(); i.setSelectionRange(p, p); } else if (e.target.id === 'q') { lib.q = e.target.value; lib.page = 1; const p = e.target.selectionStart; app.innerHTML = libraryView(); const i = document.getElementById('q'); i.focus(); i.setSelectionRange(p, p); } };
app.onchange = async e => { const { id, value, checked } = e.target; if (id === 'tlv' || id === 'tso') { await tutor.onChange(id, value); return; } if (id === 'bkimp') { await importBackup(e.target.files?.[0]); e.target.value = ''; return; }
  if (id === 'ft') { lib.type = value; lib.page = 1; render(); } else if (id === 'fl') { lib.level = value; lib.page = 1; render(); } else if (id === 'gl') { lib.gl = value; render(); } else if (id === 'fs') { lib.saved = !!checked; lib.page = 1; render(); }
  else if (id === 'lnrate') { lsn.rate = +value; render(); } else if (id === 'snz') { S.notif = { ...S.notif, snooze: +value }; await repo.setMeta('notif', S.notif); render(); }
  else if (id === 'tsz') { S.tsize = value; await repo.setMeta('tsize', value); applyTheme(); render(); }
  else if (id === 'th') { S.theme = value; await repo.setMeta('theme', value); applyTheme(); render(); } };
app.onkeydown = e => { if (tab === 'tutor') tutor.onKey(e); };
app.onmousedown = e => { if (e.target?.closest?.('#tsend')) e.preventDefault(); }; // Send must not steal focus from the message box (keeps the keyboard open on phones)
addEventListener('online', () => { sb?.initialize?.().finally(render); }); addEventListener('offline', render);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
initGlass();
const tbS = document.getElementById('tbSearch'), tbG = document.getElementById('tbSettings');
if (tbS) tbS.onclick = () => { tab = 'library'; lib.mode = 'search'; lib.detail = null; render(); document.getElementById('gq')?.focus?.(); };
if (tbG) tbG.onclick = () => { tab = 'me'; lib.detail = null; render(); document.getElementById('settings')?.scrollIntoView?.({ behavior: 'smooth' }); };
const tbT = document.getElementById('tbTutor'); if (tbT) tbT.onclick = () => { tab = 'tutor'; lib.detail = null; showAns = false; render(); };
applyTheme(); arm(); render();
