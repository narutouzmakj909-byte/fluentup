// Deterministic quiz builder (seeded; no AI). Produces questions consumable by gradeAnswer().
export const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function buildQuiz(entries, { count = 5, seed = 1 } = {}) {
  const r = rng(seed), shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const out = [];
  shuffle(entries).slice(0, count).forEach((e, i) => {
    const blank = e.ex[0].replace(new RegExp(esc(e.en), 'i'), '_____');
    if (i % 2 === 1 && blank !== e.ex[0]) out.push({ id: e.id, type: 'fill', prompt: blank, hint: e.def, answer: e.en });
    else if (entries.length >= 4) {
      const opts = shuffle([e, ...shuffle(entries.filter(x => x.id !== e.id)).slice(0, 3)]);
      out.push({ id: e.id, type: 'mcq', prompt: `What does "${e.en}" mean?`, options: opts.map(x => x.def), answer: opts.findIndex(x => x.id === e.id) });
    }
  });
  return out;
}
