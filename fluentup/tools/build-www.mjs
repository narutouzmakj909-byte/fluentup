// Copies the static app into ./www for Capacitor (no bundler needed: the app is plain ES modules). Usage: node tools/build-www.mjs
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
rmSync('www', { recursive: true, force: true }); mkdirSync('www');
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icons', 'src']) cpSync(f, 'www/' + f, { recursive: true });
if (existsSync('config.js')) cpSync('config.js', 'www/config.js');
console.log('www/ ready');
