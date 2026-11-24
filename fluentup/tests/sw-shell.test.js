import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync, existsSync } from 'node:fs'; import { dirname, join, normalize } from 'node:path';
// The service worker precaches SHELL with cache.addAll (all-or-nothing). If a file is missing from disk the install fails; if a needed file is
// missing from SHELL the first offline launch breaks. This test derives the needed set from the real imports and data loads.
const root = new URL('..', import.meta.url).pathname, read = p => readFileSync(join(root, p), 'utf8');
const sw = read('sw.js'), shell = [...sw.match(/SHELL = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const need = new Set(['index.html', 'manifest.webmanifest', 'icon.svg', 'src/styles/app.css']);
(function crawl(f) { if (need.has(f) && f !== 'src/app.js' && f.endsWith('.js')) return; need.add(f);
  for (const m of read(f).matchAll(/(?:from\s+|import\()\s*'(\.[^']+\.js)'/g)) { const p = normalize(join(dirname(f), m[1])).replace(/\\/g, '/'); if (existsSync(join(root, p))) crawl(p); } })('src/app.js');
for (const m of read('src/app.js').matchAll(/load\('([\w-]+)'\)/g)) need.add(`src/data/${m[1]}.json`);
test('every SHELL entry exists on disk', () => { for (const f of shell) if (f !== './') assert.ok(existsSync(join(root, f)), 'missing on disk: ' + f); });
test('every file the app needs to start offline is precached', () => { const have = new Set(shell); for (const f of need) assert.ok(have.has(f), 'not precached: ' + f); });
test('precached list has no duplicates and includes the app entry document', () => { assert.equal(new Set(shell).size, shell.length); assert.ok(shell.includes('./') || shell.includes('index.html')); });
