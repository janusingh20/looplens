import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotesContext } from './components/bits';
import { CodePanel } from './components/CodePanel';
import { StaticTrace } from './components/Ledger';
import { TopBar, type ProgressStep } from './components/TopBar';
import { byId, SLICE } from './content/problems';
import { announce, ANNOUNCER_ID } from './lib/announce';
import { log } from './lib/log';
import { loadSessions, saveSessions } from './lib/persist';
import { applyTheme, storedTheme, systemTheme, urlCondition, urlNotes, type Theme } from './lib/prefs';
import { go, href, skipToMain, useRoute, type Route } from './lib/route';
import { Bank } from './screens/Bank';
import { Done } from './screens/Done';
import { MODE_LABEL, ProblemScreen } from './screens/ProblemScreen';
import { Orientation } from './screens/Orientation';
import { Start } from './screens/Start';
import { countVerdict, initSession, modeFor, score, sessionReducer, type SessionAction, type SessionState } from './sim/session';
import { simulate } from './sim/simulate';
import type { Mode, Problem, Trace } from './sim/types';

const traces = new Map<string, Trace>();
const traceOf = (p: Problem) => {
  let t = traces.get(p.id);
  if (!t) traces.set(p.id, (t = simulate(p)));
  return t;
};

// The main sequence and the problem bank's "Try it" keep separate attempts.
type Track = 'main' | 'try';
const keyOf = (p: Problem, mode: Mode, track: Track = 'main') => `${track === 'try' ? 'try:' : ''}${p.id}:${mode}`;

/** What the page is, for the browser tab and for screen readers. */
function titleFor(route: Route, condition: 'predict' | 'watch'): string {
  switch (route.name) {
    case 'start':
      return 'LoopLens';
    case 'orientation':
      return 'The phases of a for loop | LoopLens';
    case 'problem': {
      const p = byId(SLICE[route.index - 1] ?? '');
      return p ? `Problem ${route.index} of ${SLICE.length}: ${p.title} | LoopLens` : 'Page not found | LoopLens';
    }
    case 'try': {
      const p = byId(route.id);
      return p ? `${p.title} | LoopLens` : 'Page not found | LoopLens';
    }
    case 'done':
      return `${condition === 'watch' ? 'Summary' : 'Your summary'} | LoopLens`;
    case 'bank':
      return 'Problem bank | LoopLens';
  }
}

const routeKey = (r: Route) => (r.name === 'problem' ? `problem-${r.index}` : r.name === 'try' ? `try-${r.id}` : r.name);

export function App() {
  const route = useRoute();
  const condition = useMemo(urlCondition, []);
  const [notes, setNotes] = useState(urlNotes);
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());
  const sessionsRef = useRef<Record<string, SessionState>>(loadSessions());
  const [sessions, setSessions] = useState<Record<string, SessionState>>(sessionsRef.current);
  // bumping a problem's counter remounts it, so a restart clears typed text too
  const [restarts, setRestarts] = useState<Record<string, number>>({});

  const commit = (next: Record<string, SessionState>) => {
    sessionsRef.current = next;
    setSessions(next);
    saveSessions(next);
  };

  useEffect(() => {
    log('session_start', { condition, screen: route.name });
  }, []); // once per page load

  // Each route gets its own tab title. After a route change, screen reader
  // users hear where they are: the page heading takes focus, or on a problem
  // (where the first answer field takes focus) the heading is announced.
  const first = useRef(true);
  const rk = routeKey(route);
  useEffect(() => {
    document.title = titleFor(route, condition);
    if (first.current) {
      first.current = false;
      return;
    }
    if (route.name === 'problem' || route.name === 'try') {
      const id = route.name === 'problem' ? SLICE[route.index - 1] : route.id;
      const p = id ? byId(id) : undefined;
      if (p) {
        const where = route.name === 'problem' ? `Problem ${route.index} of ${SLICE.length}. ` : '';
        announce(`${where}${MODE_LABEL[modeFor(p, condition)]}: ${p.title}.`, true);
        return;
      }
    }
    const h = document.querySelector<HTMLElement>('#main h1');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  }, [rk]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  const act = useCallback((p: Problem, mode: Mode, track: Track, a: SessionAction) => {
    const t = traceOf(p);
    const key = keyOf(p, mode, track);
    const cur = sessionsRef.current[key] ?? initSession(p, mode, t);
    const next = sessionReducer(p, t, cur, a);
    if (next === cur) return;
    // log what changed: one event per prediction, one per finished problem
    if (a.type === 'answer') {
      const slot = cur.slots[cur.cur];
      const v = next.records[cur.cur]?.verdict;
      const row = slot.kind === 'count' ? null : t.rows[slot.row];
      log('prediction', {
        problem: p.id,
        mode,
        slot: slot.kind,
        step: row?.step ?? null,
        phase: row?.phase ?? null,
        answer: v?.given ?? null,
        expected: v?.expected ?? null,
        correct: v?.correct ?? null,
        misconception: v?.misconception ?? null,
        variant: v?.variant ?? null,
        ms: a.ms,
      });
    }
    if (a.type === 'selfExplain') log('self_explanation', { problem: p.id, text: a.text });
    if (cur.stage !== 'done' && next.stage === 'done') {
      const sc = score(next);
      const cv = countVerdict(next);
      log('problem_done', { problem: p.id, mode, asked: sc.asked, right: sc.right, misconceptions: sc.misconceptions.map((m) => m.id).join(' '), countRight: cv ? cv.correct : null });
    }
    commit({ ...sessionsRef.current, [key]: next });
  }, []);

  const restart = useCallback((p: Problem, mode: Mode, track: Track) => {
    const key = keyOf(p, mode, track);
    const { [key]: _gone, ...rest } = sessionsRef.current;
    commit(rest);
    setRestarts((r) => ({ ...r, [key]: (r[key] ?? 0) + 1 }));
    log('problem_restart', { problem: p.id, mode });
  }, []);

  const restartAll = () => {
    commit({});
    setRestarts((r) => Object.fromEntries(Object.entries(r).map(([k, n]) => [k, n + 1])));
    log('restart_all', {});
    go({ name: 'start' });
  };

  const sliceSessions = SLICE.map((id) => {
    const p = byId(id) as Problem;
    return sessions[keyOf(p, modeFor(p, condition))];
  });

  // progress through the slice, for the top bar
  const sliceIndex = route.name === 'problem' ? route.index : null;
  const progress: ProgressStep[] | undefined =
    sliceIndex !== null
      ? SLICE.map((id, k) => {
          const p = byId(id) as Problem;
          const mode = modeFor(p, condition);
          const s = sliceSessions[k];
          return { label: MODE_LABEL[mode], state: k + 1 === sliceIndex ? 'current' : s?.stage === 'done' ? 'done' : 'todo', href: href({ name: 'problem', index: k + 1 }) };
        })
      : undefined;

  const problemScreen = (p: Problem, track: Track, onNext: () => void, nextLabel: string) => {
    const mode = modeFor(p, condition);
    const key = keyOf(p, mode, track);
    return (
      <ProblemScreen
        key={`${key}#${restarts[key] ?? 0}`}
        p={p}
        t={traceOf(p)}
        s={sessions[key] ?? initSession(p, mode, traceOf(p))}
        act={(a) => act(p, mode, track, a)}
        onNext={onNext}
        nextLabel={nextLabel}
        onRestart={() => restart(p, mode, track)}
      />
    );
  };

  let screen: React.ReactNode;
  switch (route.name) {
    case 'start':
      screen = <Start />;
      break;
    case 'orientation':
      screen = <Orientation />;
      break;
    case 'problem': {
      const id = SLICE[route.index - 1];
      const p = id ? byId(id) : undefined;
      if (!p) {
        screen = <NotFound />;
        break;
      }
      const last = route.index === SLICE.length;
      screen = problemScreen(p, 'main', () => go(last ? { name: 'done' } : { name: 'problem', index: route.index + 1 }), last ? 'See your summary' : 'Next problem');
      break;
    }
    case 'try': {
      const p = byId(route.id);
      if (!p) {
        screen = <NotFound />;
        break;
      }
      if (p.role === 'header' || p.role === 'checkpoint') {
        screen = <Scheduled p={p} />;
        break;
      }
      screen = problemScreen(p, 'try', () => go({ name: 'bank' }), 'Back to the problem bank');
      break;
    }
    case 'done':
      screen = <Done slice={sliceSessions} onRestartAll={restartAll} condition={condition} />;
      break;
    case 'bank':
      screen = <Bank />;
      break;
  }

  return (
    <NotesContext.Provider value={notes}>
      <a className="skip" href="#main" onClick={skipToMain}>
        Skip to content
      </a>
      <div id={ANNOUNCER_ID} className="sr-only" aria-live="polite" aria-atomic="true" />
      <TopBar progress={progress} notes={notes} onNotes={() => setNotes((x) => !x)} dark={theme === 'dark'} onTheme={toggleTheme} />
      {screen}
    </NotesContext.Provider>
  );
}

function NotFound() {
  return (
    <main className="page" id="main">
      <h1>That page isn't part of LoopLens</h1>
      <p>
        <a href={href({ name: 'start' })}>Go to the start</a> or <a href={href({ name: 'bank' })}>open the problem bank</a>.
      </p>
    </main>
  );
}

function Scheduled({ p }: { p: Problem }) {
  const t = traceOf(p);
  return (
    <main className="page" id="main">
      <h1>{p.title}</h1>
      <p className="lede">
        {p.role === 'header' ? 'Problems where you write the header arrive in Milestone 2.' : 'The checkpoint arrives in Milestone 2.'} Here is the problem as authored and the trace of its reference solution, already checked against OpenJDK.
      </p>
      {p.header && <p>{p.header.prompt}</p>}
      <div className="scheduled-code">
        <CodePanel problem={p} activeLine={null} activeSegment={null} activePhase={null} />
      </div>
      <div className="table-scroll">
        <StaticTrace p={p} t={t} />
      </div>
      <p className="back-link">
        <a href={href({ name: 'bank' })}>Back to the problem bank</a>
      </p>
    </main>
  );
}
