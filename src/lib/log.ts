// Anonymous event log (constraint C5: no names, no accounts, no identifying data).
//
// Every prediction becomes one event: problem, step, phase, the answer, whether
// it was right, the misconception label, and the time taken. Events are kept
// in this browser. If VITE_LOG_URL is set at build time (the Google Apps
// Script web app in apps-script/), they are also sent there in small batches;
// anything that fails to send stays queued and is retried later.

export interface LogEvent {
  sid: string;
  seq: number;
  t: string;
  type: string;
  data: Record<string, unknown>;
}

const LOG_KEY = 'looplens.log.v1';
const QUEUE_KEY = 'looplens.queue.v1';
const SID_KEY = 'looplens.sid.v1';
const MAX_EVENTS = 3000;
const ENDPOINT = (import.meta.env.VITE_LOG_URL as string | undefined) || '';

let memory: LogEvent[] = [];
let seq = 0;

function read<T>(store: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(store: Storage | undefined, key: string, value: unknown) {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep the in memory copy */
  }
}

const local = () => (typeof localStorage === 'undefined' ? undefined : localStorage);
const sessionStore = () => (typeof sessionStorage === 'undefined' ? undefined : sessionStorage);

function newId(): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

let sid = '';
export function sessionId(): string {
  if (sid) return sid;
  sid = read<string>(sessionStore(), SID_KEY, '') || newId();
  write(sessionStore(), SID_KEY, sid);
  return sid;
}

export function log(type: string, data: Record<string, unknown> = {}) {
  const stored = read<LogEvent[]>(local(), LOG_KEY, memory);
  if (seq === 0) {
    // keep (sid, seq) unique across reloads of the same tab
    for (const x of stored) if (x.sid === sessionId() && x.seq >= seq) seq = x.seq + 1;
  }
  const e: LogEvent = { sid: sessionId(), seq: seq++, t: new Date().toISOString(), type, data };
  const all = [...stored, e].slice(-MAX_EVENTS);
  memory = all;
  write(local(), LOG_KEY, all);
  if (ENDPOINT) {
    const q = [...read<LogEvent[]>(local(), QUEUE_KEY, []), e].slice(-MAX_EVENTS);
    write(local(), QUEUE_KEY, q);
    scheduleFlush();
  }
}

export function readLog(): LogEvent[] {
  return read<LogEvent[]>(local(), LOG_KEY, memory);
}

/** Empty this browser's copy of the log and return what was there, so the page can offer Undo. */
export function clearLog(): LogEvent[] {
  const before = readLog();
  memory = [];
  write(local(), LOG_KEY, []);
  return before;
}

/** Put back events removed by clearLog, keeping anything logged since. */
export function restoreLog(events: LogEvent[]) {
  const since = readLog();
  const all = [...events, ...since].slice(-MAX_EVENTS);
  memory = all;
  write(local(), LOG_KEY, all);
}

export const remoteLogging = () => Boolean(ENDPOINT);

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, 1500);
}

export async function flush(): Promise<void> {
  if (!ENDPOINT) return;
  const q = read<LogEvent[]>(local(), QUEUE_KEY, []);
  if (!q.length) return;
  try {
    // text/plain keeps this a "simple" request, which Apps Script accepts without a CORS preflight
    await fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(q) });
    const rest = read<LogEvent[]>(local(), QUEUE_KEY, []).filter((e) => !q.some((x) => x.sid === e.sid && x.seq === e.seq));
    write(local(), QUEUE_KEY, rest);
  } catch {
    /* offline: the queue is kept and sent again later */
  }
}

if (typeof window !== 'undefined' && ENDPOINT) {
  window.addEventListener('pagehide', () => {
    const q = read<LogEvent[]>(local(), QUEUE_KEY, []);
    if (q.length && navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(q)], { type: 'text/plain' }));
  });
  window.addEventListener('online', () => void flush());
}
