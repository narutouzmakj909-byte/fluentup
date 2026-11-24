// Offline-first outbox: idempotent ops, retry with backoff, last-writer-wins by updatedAt.
export class Outbox {
  constructor(store = []) { this.q = store.map(o => ({ attempts: 0, ...o })); }
  enqueue(op) {
    if (!op.id) throw new Error('op.id required');
    if (this.q.some(o => o.id === op.id)) return false;
    this.q.push({ attempts: 0, ...op }); return true;
  }
  async flush(send, now = Date.now()) {
    const out = { sent: 0, failed: 0, conflicts: [] };
    for (const op of [...this.q]) {
      if (op.nextTry && op.nextTry > now) continue;
      try {
        const r = await send(op);
        if (r?.conflict) out.conflicts.push({ op, server: r.server });
        this.q = this.q.filter(o => o.id !== op.id); out.sent++;
      } catch {
        op.attempts++; op.nextTry = now + Math.min(3600000, 1000 * 2 ** op.attempts); out.failed++;
      }
    }
    return out;
  }
}
export const resolve = (local, server) => (local.updatedAt ?? 0) >= (server.updatedAt ?? 0) ? local : server;
