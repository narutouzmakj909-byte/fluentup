// Exports every bundled library entry (src/data/seed*.json) to import-out/entries.csv for the Supabase `entries` table.
// Card sync has a foreign key to entries(id), so the server must contain these ids before cards can sync. See docs/SUPABASE.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { prepareImport } from '../src/core/importer.js';
const out = process.argv[2] ?? 'import-out', files = ['seed', 'seed2', 'seed3', 'seed4', 'seed5'];
const all = files.flatMap(f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8')));
const r = prepareImport(all.map(e => JSON.stringify(e)).join('\n')); mkdirSync(out, { recursive: true });
writeFileSync(`${out}/entries.csv`, r.csv); writeFileSync(`${out}/rejected.json`, JSON.stringify(r.rejected, null, 1));
console.log(`entries: ${all.length}, accepted ${r.ok.length}, rejected ${r.rejected.length} -> ${out}/entries.csv`);
if (r.rejected.length) process.exit(1);
