// Client for the NORA AI tutor edge function. No AI key exists in the app; the function checks the signed-in user and rate limits.
// Messages are Somali first, English in brackets. Somali wording should be reviewed by a native speaker.
const MSG = {
  auth: 'Fadlan gal akoonkaaga (sign in) si aad u isticmaasho tutor-ka.',
  rate_limited: 'Waad ka badisay xadka hadda. Fadlan yar sug. (Rate limit reached; try later.)',
  bad_input: 'Fariintu way dheer tahay ama way madhan tahay. (Message empty or too long.)',
  unavailable: 'Tutor-ku hadda lama heli karo. (Tutor unavailable.)',
  offline: 'Internet ma jiro. (You are offline.)',
  timeout: 'Tutor-ku wakhti dheer buu qaatay. Fadlan mar kale isku day. (The tutor took too long; try again.)',
};
export const tutorMessage = code => MSG[code] ?? MSG.unavailable;
// Errors where sending the same message again can succeed. auth needs a sign-in first; bad_input needs a different message.
export const retryable = code => ['rate_limited', 'unavailable', 'offline', 'timeout', 'interrupted'].includes(code);
export const LIMITS = { user: 1500, assistant: 4000, messages: 20 };
const fail = error => ({ ok: false, error, message: tutorMessage(error) });
const byStatus = s => s === 401 ? 'auth' : s === 429 ? 'rate_limited' : s === 400 || s === 413 ? 'bad_input' : s === 504 ? 'timeout' : 'unavailable';
const KNOWN = new Set(['auth', 'rate_limited', 'bad_input', 'unavailable', 'timeout']);
// token may be sync or async. refresh (optional) is called once after a 401 and should resolve true when a new token is available.
export function createTutor({ url, token, refresh, fetchImpl = globalThis.fetch, timeoutMs = 35000 }) {
  const endpoint = url ? `${String(url).replace(/\/+$/, '')}/functions/v1/tutor` : '';
  return async function ask(messages, { level = 'A1', somaliLevel = 'high', signal } = {}) {
    if (!url || !token) return fail('auth');
    const clean = (Array.isArray(messages) ? messages : []).filter(m => m && (m.role === 'user' || m.role === 'assistant')).slice(-LIMITS.messages)
      .map(m => ({ role: m.role, content: String(m.content ?? '').slice(0, m.role === 'user' ? LIMITS.user : LIMITS.assistant) }));
    const once = async tk => {
      const ctl = new AbortController(); let timedOut = false;
      const onAbort = () => ctl.abort(); if (signal?.aborted) return { error: 'aborted' }; signal?.addEventListener?.('abort', onAbort);
      const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, timeoutMs);
      try {
        const r = await fetchImpl(endpoint, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${tk}` }, body: JSON.stringify({ messages: clean, level, somaliLevel }) });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, j: j && typeof j === 'object' ? j : {} };
      } catch { return { error: timedOut ? 'timeout' : signal?.aborted ? 'aborted' : 'offline' }; }
      finally { clearTimeout(timer); signal?.removeEventListener?.('abort', onAbort); }
    };
    try {
      let tk = await token(); if (!tk) return fail('auth');
      let r = await once(tk);
      if (r.status === 401 && refresh && await refresh().catch(() => false)) { tk = await token(); if (tk) r = await once(tk); }
      if (r.error) return fail(r.error);
      if (!r.ok) return fail(KNOWN.has(r.j.error) ? r.j.error : byStatus(r.status));
      if (typeof r.j.reply !== 'string' || !r.j.reply.trim()) return fail('unavailable');
      return r.j.truncated ? { ok: true, reply: r.j.reply, truncated: true } : { ok: true, reply: r.j.reply };
    } catch { return fail('unavailable'); }
  };
}
