import { byId } from '../content/problems';
import { initSession, type SessionState } from '../sim/session';
import { simulate } from '../sim/simulate';

// Progress survives a reload in the same tab (sessionStorage), so an
// accidental refresh doesn't wipe a learner's work. Anything that doesn't
// match the current problem bank exactly is dropped instead of trusted.

const KEY = 'looplens.sessions.v1';

export function loadSessions(): Record<string, SessionState> {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, SessionState>;
    const out: Record<string, SessionState> = {};
    for (const [key, s] of Object.entries(data)) {
      try {
        const p = s && typeof s.problemId === 'string' ? byId(s.problemId) : undefined;
        if (!p || !['worked', 'faded', 'independent', 'watch'].includes(s.mode)) continue;
        const fresh = initSession(p, s.mode, simulate(p));
        if (!Array.isArray(s.records) || s.records.length !== fresh.slots.length) continue;
        if (JSON.stringify(s.slots) !== JSON.stringify(fresh.slots)) continue;
        out[key] = s;
      } catch {
        /* skip this entry */
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveSessions(all: Record<string, SessionState>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked or full: progress just won't survive a reload */
  }
}
