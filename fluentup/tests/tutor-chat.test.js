import test from 'node:test'; import assert from 'node:assert/strict';
import { renderReply, buildContext, sanitizeStored, newMsg, histKey, trimHistory, TUTOR, QUICK } from '../src/core/tutorChat.js';
test('renderReply escapes HTML before formatting (no script/handler injection) and formats lists, bold, code, headings', () => {
  const evil = renderReply('<img src=x onerror=alert(1)> **bold** <script>alert(1)</script> [x](javascript:alert(1)) "q" \'s\'');
  assert.ok(!/<img|<script/i.test(evil)); assert.match(evil, /&#60;img/); assert.match(evil, /<strong>bold<\/strong>/); assert.ok(!/<a\b/i.test(evil));
  const h = renderReply('## Tense\n**Incorrect:** I am go\n**Correct:** I am going\n\n- a\n- b\n\n1. one\n2. two\n\nUse `is` here.');
  assert.match(h, /<p><strong>Tense<\/strong><\/p>/); assert.match(h, /<p><strong>Incorrect:<\/strong> I am go<br><strong>Correct:<\/strong> I am going<\/p>/); assert.match(h, /<ul><li>a<\/li><li>b<\/li><\/ul>/); assert.match(h, /<ol><li>one<\/li><li>two<\/li><\/ol>/); assert.match(h, /<code>is<\/code>/);
  assert.match(renderReply('3. c\n4. d'), /<ol start="3">/); assert.equal(renderReply(''), ''); assert.match(renderReply('Salaan\r\nMaanta'), /Salaan<br>Maanta/); assert.match(renderReply('Ingiriis: **waa** sax — “is”'), /“is”/);
  assert.ok(!renderReply('a'.repeat(20000)).includes('undefined'));
});
test('buildContext: only answered exchanges plus the target, newest 20, starts with a user turn, clipped', () => {
  const h = [newMsg('user', 'q1', { status: 'sent' }), newMsg('assistant', 'a1'), newMsg('user', 'lost', { status: 'failed' }), newMsg('user', 'q2', { status: 'sent' }), newMsg('assistant', 'a2'), newMsg('user', 'now', { status: 'pending' })];
  assert.deepEqual(buildContext(h, h[5].id).map(m => m.content), ['q1', 'a1', 'q2', 'a2', 'now']); assert.deepEqual(buildContext(h, h[2].id).map(m => m.content), ['q1', 'a1', 'lost']); // retrying an older failed message only sees what came before it
  const long = Array.from({ length: 60 }, (_, i) => newMsg(i % 2 ? 'assistant' : 'user', 'm' + i, i % 2 ? {} : { status: 'sent' })); long.push(newMsg('user', 'last', { status: 'pending' }));
  const c = buildContext(long, long.at(-1).id); assert.ok(c.length <= TUTOR.maxContext); assert.equal(c[0].role, 'user'); assert.equal(c.at(-1).content, 'last');
  const clipped = buildContext([newMsg('assistant', 'x'.repeat(9000)), newMsg('user', 'y'.repeat(5000), { status: 'pending' })]); assert.deepEqual(clipped.map(m => m.role), ['user']); assert.equal(clipped[0].content.length, 1500);
  assert.deepEqual(buildContext([]), []);
});
test('sanitizeStored: corrupt entries dropped, in-flight requests become failed/interrupted, size capped', () => {
  assert.deepEqual(sanitizeStored(null), []); assert.deepEqual(sanitizeStored('x'), []); assert.deepEqual(sanitizeStored({}), []);
  const s = sanitizeStored([null, 5, { role: 'system', content: 'x' }, { role: 'user', content: '' }, { role: 'user', content: 'ok', status: 'sent', id: 'a' }, { role: 'user', content: 'wait', status: 'pending', id: 'b' }, { role: 'user', content: 'bad', status: 'failed', error: { code: 'offline', message: 'Internet ma jiro' }, id: 'c' }, { role: 'assistant', content: 'hi', truncated: true, id: 'd', at: 'nan' }, { role: 'user', content: 'noid' }]);
  assert.deepEqual(s.map(m => m.id).slice(0, 4), ['a', 'b', 'c', 'd']); assert.equal(s[1].status, 'failed'); assert.equal(s[1].error.code, 'interrupted'); assert.equal(s[2].error.code, 'offline'); assert.equal(s[3].truncated, true); assert.equal(s[3].at, 0); assert.ok(s[4].id && s[4].status === 'sent');
  const big = sanitizeStored(Array.from({ length: 500 }, (_, i) => ({ role: 'user', content: 'm' + i, status: 'sent', id: 'i' + i }))); assert.equal(big.length, TUTOR.maxStored); assert.equal(big.at(-1).id, 'i499');
  assert.equal(sanitizeStored([{ role: 'assistant', content: 'x'.repeat(20000) }])[0].content.length, TUTOR.storedChars); assert.equal(trimHistory([1, 2, 3], 2).length, 2);
});
test('history is keyed per account; quick prompts include the required Somali instructions', () => {
  assert.notEqual(histKey('a'), histKey('b')); assert.match(histKey('abc'), /abc/); assert.equal(histKey(null), histKey(undefined));
  const labels = QUICK.map(q => q.label); for (const l of ['Grammar-kayga sax', 'Eraygan ii sharax', 'I sii quiz', 'Ila practice garee', 'Maxaa jumladan ka qaldan?', 'Ii sharax tense-kan', 'English kaliya ila hadal', 'Af-Soomaali igu sharax']) assert.ok(labels.includes(l), l);
});
