// The Tutor inside the real app.js (fake DOM, no Supabase configured): navigation entry points work and every existing tab still renders.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
test('AI Tutor is reachable from Home tile and the top bar; existing tabs are unaffected', async () => {
  const el = () => ({ innerHTML: '', dataset: {}, setAttribute(k, v) { this.attrs = { ...this.attrs, [k]: v }; }, focus() {}, setSelectionRange() {}, value: '' });
  const app = el(), nav = el(), tbTutor = el(), nodes = { app, tbTutor }; nav.classList = { toggle(c, on) { this.last = [c, on]; } };
  globalThis.document = { getElementById: id => nodes[id] ?? el(), querySelector: () => nav, querySelectorAll: () => [] };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true }); globalThis.addEventListener = () => {}; globalThis.alert = () => {};
  const seed = readFileSync(new URL('../src/data/seed.json', import.meta.url), 'utf8'); globalThis.fetch = async () => ({ json: async () => JSON.parse(seed) });
  await import('../src/app.js');
  assert.match(app.innerHTML, /data-t="tutor"/); assert.match(app.innerHTML, /AI Tutor/); assert.match(app.innerHTML, /tile wide/); assert.match(app.innerHTML, /Today's goal/);
  await app.onclick({ target: { dataset: { t: 'tutor' }, id: '' } }); assert.match(app.innerHTML, /NORA Tutor/); assert.match(app.innerHTML, /needs cloud setup/); // no Supabase in tests: honest setup message, no fake chat
  assert.equal(tbTutor.attrs['aria-pressed'], 'true'); assert.deepEqual(nav.classList.last, ['nopill', true]);
  nav.onclick({ target: { dataset: { t: 'home' } } }); assert.match(app.innerHTML, /Today's goal/); assert.equal(tbTutor.attrs['aria-pressed'], 'false'); assert.deepEqual(nav.classList.last, ['nopill', false]);
  tbTutor.onclick(); assert.match(app.innerHTML, /NORA Tutor/);
  for (const t of ['library', 'speak', 'quiz', 'plan', 'me', 'review', 'home']) { nav.onclick({ target: { dataset: { t } } }); assert.ok(app.innerHTML.length > 200, t); assert.ok(!/NORA Tutor/.test(app.innerHTML), t); }
  assert.match(app.innerHTML, /Today's goal/);
  app.onkeydown({ key: 'Enter', target: { id: 'x' } }); // keydown outside the tutor is ignored
});
test('index.html has the top-bar entry, the nav is unchanged (6 tabs), and no AI key/secret reaches client code', () => {
  const rd = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8'), html = rd('index.html');
  assert.match(html, /id="tbTutor"[^>]*aria-label="AI Tutor"/); assert.equal((html.match(/<nav[\s\S]*?<\/nav>/)[0].match(/data-t="/g) ?? []).length, 6); assert.ok(!/data-t="tutor"/.test(html.match(/<nav[\s\S]*?<\/nav>/)[0]));
  for (const f of ['index.html', 'src/app.js', 'src/ui/tutorScreen.js', 'src/core/tutor.js', 'src/core/tutorChat.js', 'src/core/supabase.js', 'config.example.js', 'sw.js']) assert.ok(!/sk-ant-|ANTHROPIC|service_role/i.test(rd(f).replace(/NEVER put the service_role key here/, '')), f);
  assert.match(rd('sw.js'), /nora-v14/); const css = rd('src/styles/app.css'); for (const c of ['.tutor{', '.tm.u .tb', '.tm.a .tb', '.tcomposer', 'prefers-reduced-motion', '.typing']) assert.ok(css.includes(c), c);
  assert.match(css, /\.tm\.u \.tb\{[^}]*var\(--grad\)/); assert.match(css, /\.tm\.a \.tb\{[^}]*var\(--glass\)/); // both themes come from the same variables as the rest of the app
});
