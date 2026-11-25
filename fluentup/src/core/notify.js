// Native (Capacitor LocalNotifications) reminders. Works only inside the Android/iOS shell; in a browser every call is a safe no-op that returns {available:false}.
// Weekday numbers: this app uses 0=Sun..6=Sat; Capacitor "weekday" uses 1=Sun..7=Sat.
const plugin = () => globalThis.Capacitor?.Plugins?.LocalNotifications ?? null;
export const nativeAvailable = () => !!plugin() && globalThis.Capacitor?.isNativePlatform?.() !== false;
const idOf = (alarmId, k) => { let h = 7; for (const ch of alarmId + ':' + k) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % 2147483000 + 1; };
export function buildSchedule(alarms) {
  const out = [];
  for (const a of alarms) { if (!a.enabled) continue; const body = a.label || 'Time to learn English', title = 'NORA';
    const base = { title, body, channelId: 'reminders' };
    if (!a.days?.length) out.push({ ...base, id: idOf(a.id, 'd'), schedule: { on: { hour: a.hour, minute: a.minute }, allowWhileIdle: true } });
    else for (const d of a.days) out.push({ ...base, id: idOf(a.id, d), schedule: { on: { weekday: d + 1, hour: a.hour, minute: a.minute }, allowWhileIdle: true } }); }
  return out;
}
export async function ensurePermission() { const p = plugin(); if (!p) return { available: false, granted: false };
  try { let r = await p.checkPermissions(); if (r.display === 'prompt' || r.display === 'prompt-with-rationale') r = await p.requestPermissions(); return { available: true, granted: r.display === 'granted' }; } catch (e) { return { available: true, granted: false, error: String(e?.message ?? e) }; } }
// Replace all scheduled reminders with the current alarm list (idempotent).
export async function syncNative(alarms) { const p = plugin(); if (!p) return { available: false, scheduled: 0 };
  try { const perm = await ensurePermission(); if (!perm.granted) return { available: true, scheduled: 0, denied: true };
    try { await p.createChannel?.({ id: 'reminders', name: 'Study reminders', importance: 4 }); } catch {}
    const pend = await p.getPending?.(); if (pend?.notifications?.length) await p.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
    const list = buildSchedule(alarms); if (list.length) await p.schedule({ notifications: list }); return { available: true, scheduled: list.length };
  } catch (e) { return { available: true, scheduled: 0, error: String(e?.message ?? e) }; } }
