import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import * as G from '../src/ui/glass.js';
test('glass buttons: icon button is labelled, text button keeps variant', () => {
  assert.match(G.LiquidGlassIconButton({ icon: 'play', label: 'Play', attrs: 'data-x="1"' }), /class="ib\s*\s*"[^>]*data-x="1"[^>]*aria-label="Play"/);
  assert.match(G.LiquidGlassButton({ label: 'Go', variant: 'p', icon: 'check' }), /^<button class="p">.*Go<\/button>$/);
});
test('glass tabs expose pressed + selected state', () => {
  const h = G.LiquidGlassTab([['a', 'A'], ['b', 'B']], 'b', 'data-k');
  assert.match(h, /data-k="a" aria-pressed="false" aria-selected="false"/); assert.match(h, /data-k="b" aria-pressed="true" aria-selected="true"/);
});
test('glass progress, toggle and input are accessible and escape input', () => {
  assert.match(G.LiquidGlassProgress(40, 'Goal'), /role="progressbar" aria-label="Goal" aria-valuenow="40"/);
  assert.match(G.LiquidGlassToggle({ id: 't', label: 'On', on: true }), /role="switch" checked/);
  assert.ok(!G.LiquidGlassInput({ id: 'i', label: 'N', value: '"><script>' }).includes('<script>'));
});
test('sheet is a labelled modal dialog; confirmSheet resolves true without a DOM (tests/SSR)', async () => {
  assert.match(G.LiquidGlassSheet({ title: 'T', body: 'b' }), /role="dialog" aria-modal="true" aria-label="T"/);
  assert.equal(await G.confirmSheet({ title: 'x', body: 'y' }), true);
  assert.doesNotThrow(() => { G.initGlass(); G.setNav('home', ['home']); G.enter(null); G.closeSheet(); });
});
test('stylesheet honours reduced motion, has backdrop fallback and both themes', () => {
  const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /@supports not \(backdrop-filter/); assert.match(css, /:root\[data-theme=dark\]/);
});
