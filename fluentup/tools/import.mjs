import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { prepareImport } from '../src/core/importer.js';
const [, , inp, out = 'import-out'] = process.argv;
if (!inp) { console.error('usage: node tools/import.mjs input.jsonl [outdir]'); process.exit(2); }
const r = prepareImport(readFileSync(inp, 'utf8')); mkdirSync(out, { recursive: true });
writeFileSync(`${out}/entries.csv`, r.csv); writeFileSync(`${out}/rejected.json`, JSON.stringify(r.rejected, null, 1));
console.log(`accepted ${r.ok.length}, rejected ${r.rejected.length} -> ${out}/`);
