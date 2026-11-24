// Capability detection for listening/speaking. Pure: pass globalThis (or a fake).
export function capabilities(g = globalThis) {
  return { tts: !!(g.speechSynthesis && g.SpeechSynthesisUtterance), recording: !!(g.navigator?.mediaDevices?.getUserMedia && g.MediaRecorder),
    recognition: !!(g.SpeechRecognition || g.webkitSpeechRecognition), secure: g.isSecureContext !== false };
}
// Honest word-overlap between a target sentence and what browser speech recognition heard.
// This measures recognised words only, NOT pronunciation quality.
export function wordMatch(target, heard) {
  const t = String(target).toLowerCase().match(/[a-z']+/g) || [], h = new Set(String(heard).toLowerCase().match(/[a-z']+/g) || []);
  const hit = t.filter(w => h.has(w)); return { matched: hit.length, total: t.length, missing: t.filter(w => !h.has(w)), ratio: t.length ? hit.length / t.length : 0 };
}
