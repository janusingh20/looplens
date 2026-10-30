import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, Rich } from '../components/bits';
import { CodePanel } from '../components/CodePanel';
import { StaticTrace } from '../components/Ledger';
import { traceSummary } from '../content/explain';
import { MISCONCEPTION_ORDER, MISCONCEPTIONS } from '../content/feedback';
import { PROBLEMS, SLICE, byId } from '../content/problems';
import { announce } from '../lib/announce';
import { clearLog, readLog, remoteLogging, restoreLog, type LogEvent } from '../lib/log';
import { condCode } from '../sim/codegen';
import { buildSlots, diagnose, diagnoseCount, diagnosePhase, diagnoseValue, expectedValue, PHASES } from '../sim/diagnose';
import { instrumentedJava } from '../sim/java';
import { simulate } from '../sim/simulate';
import type { Answer, Problem, Role, Verdict } from '../sim/types';
import { href } from '../lib/route';

const ROLE_LABEL: Record<Role, string> = {
  worked: 'Worked example',
  faded: 'Faded example',
  independent: 'On your own',
  header: 'Write the header (LO5)',
  checkpoint: 'Checkpoint',
};

interface Verification {
  jdk: string;
  runtime: string;
  checkedAt: string;
  commit: string | null;
  runUrl: string | null;
  allMatch: boolean;
  matched: number;
  total: number;
  problems: { id: string; match: boolean; steps: number }[];
}

function useVerification() {
  const [v, setV] = useState<Verification | null | 'missing'>(null);
  useEffect(() => {
    let live = true;
    fetch('./verification.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Verification) => live && setV(j))
      .catch(() => live && setV('missing'));
    return () => {
      live = false;
    };
  }, []);
  return v;
}

const P = (id: string) => byId(id) as Problem;

function examples(): Record<string, Verdict> {
  const t2 = simulate(P('P02'));
  const t4 = simulate(P('P04'));
  const t6 = simulate(P('P06'));
  const t8 = simulate(P('P08'));
  return {
    M1: diagnoseCount(P('P04'), t4, 5),
    M2: diagnoseValue(P('P06'), t6, t6.rows.findIndex((r) => r.finalCheck), { kind: 'bool', value: true }),
    M3: diagnosePhase(P('P04'), t4, 1, 'body'),
    M4: diagnoseValue(P('P02'), t2, t2.rows.findIndex((r) => r.finalUpdate), { kind: 'number', value: 8 }),
    M5: diagnoseValue(P('P08'), t8, 1, { kind: 'bool', value: true }),
  };
}

/** One rendered example of every message variant, found by trying plausible answers on every step of the bank. */
function allVariants(): { variant: string; where: string; message: string }[] {
  const seen = new Map<string, { variant: string; where: string; message: string }>();
  for (const p of PROBLEMS) {
    const t = simulate(p);
    for (const slot of buildSlots(p, t, 'independent')) {
      const cands: Answer[] = [];
      if (slot.kind === 'count') [0, 1, 2, 3, 4, 5, 9, 10, 16].forEach((value) => cands.push({ kind: 'number', value }));
      else if (slot.kind === 'phase') PHASES.forEach((value) => cands.push({ kind: 'phase', value }));
      else {
        const row = t.rows[slot.row];
        const e = expectedValue(p, row);
        if (e.kind === 'bool') cands.push({ kind: 'bool', value: !e.value }, e);
        else if (e.kind === 'text') cands.push(e, { kind: 'text', value: '7' });
        else if (e.kind === 'number') [e.value, e.value + 1, row.iBefore ?? 0, p.bound, 3].forEach((value) => cands.push({ kind: 'number', value }));
      }
      for (const a of cands) {
        const v = diagnose(p, t, slot, a);
        if (!v.message || seen.has(v.variant)) continue;
        const step = slot.kind === 'count' ? 'pass count' : `step ${t.rows[slot.row].step}`;
        seen.set(v.variant, { variant: v.variant, where: `${p.id}, ${step}, answer ${v.given}`, message: v.message });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.variant.localeCompare(b.variant));
}

function describe(e: LogEvent): string {
  const d = e.data as Record<string, string | number | boolean | null>;
  if (e.type === 'prediction') return `${d.problem} step ${d.step ?? 'count'} ${d.slot}: ${d.answer} (${d.correct ? 'right' : d.misconception ? `${d.misconception}` : 'wrong'}, ${d.ms} ms)`;
  if (e.type === 'problem_done') return `${d.problem}: ${d.right} of ${d.asked} right`;
  if (e.type === 'warmup') return `item ${d.item}: ${d.answer} (${d.correct ? 'right' : 'wrong'})`;
  if (e.type === 'self_explanation') return `${d.problem}: ${String(d.text).slice(0, 60)}${String(d.text).length > 60 ? '...' : ''}`;
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

export function Bank() {
  const ver = useVerification();
  const ex = useMemo(examples, []);
  const variants = useMemo(allVariants, []);
  const [events, setEvents] = useState<LogEvent[]>(() => readLog());
  const status = (id: string) => (ver && ver !== 'missing' ? ver.problems.find((x) => x.id === id) : undefined);
  const counts = PROBLEMS.reduce<Record<string, number>>((acc, p) => ((acc[p.role] = (acc[p.role] ?? 0) + 1), acc), {});

  const [copied, setCopied] = useState('');
  const [cleared, setCleared] = useState<LogEvent[] | null>(null);
  const say = (msg: string) => {
    setCopied(msg);
    announce(msg);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(events, null, 2));
      say(`Copied ${events.length} events as JSON.`);
    } catch {
      say('Copying is blocked here. Use Download instead.');
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'looplens-events.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <main className="page bank" id="main">
      <h1>Problem bank</h1>
      <p className="lede">
        Each problem is written once as a small spec. The same spec produces the code the learner sees, the trace LoopLens shows, and a Java program that GitHub Actions runs on OpenJDK after every commit to prove the two agree.
      </p>

      <div className={`verify ${ver === null ? 'is-loading' : ver === 'missing' ? 'is-missing' : ver.allMatch ? 'is-ok' : 'is-bad'}`} role="status">
        {ver && ver !== 'missing' && (
          <span className="verify-icon" aria-hidden="true">
            {ver.allMatch ? (
              <CheckIcon size={22} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 16 16">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </span>
        )}
        <div>
        {ver === null && <p>Checking the latest verification report...</p>}
        {ver === 'missing' && <p>No verification report in this build. Run <code className="ic">npm run verify:java</code> to create one.</p>}
        {ver && ver !== 'missing' && (
          <>
            <p className="verify-head">
              {ver.matched} of {ver.total} traces match real Java.
            </p>
            <p>
              Checked on <strong>{ver.jdk.replace(/^openjdk version "([^"]+)".*$/, 'OpenJDK $1')}</strong>
              {ver.commit ? ` for commit ${ver.commit}` : ''}, {new Date(ver.checkedAt).toLocaleString()}.{' '}
              {ver.runUrl && (
                <a href={ver.runUrl} target="_blank" rel="noreferrer">
                  Open the GitHub Actions run
                </a>
              )}
            </p>
          </>
        )}
        </div>
      </div>

      <p className="bank-counts">
        {PROBLEMS.length} problems: {counts.worked} worked example, {counts.faded} faded examples, {counts.independent} tracing problems on your own, {counts.header} write the header problems, and a {counts.checkpoint} problem checkpoint. The
        Milestone 1 slice is {SLICE.join(', ')}.
      </p>

      <div className="bank-list">
        {PROBLEMS.map((p) => {
          const t = simulate(p);
          const st = status(p.id);
          const playable = p.role === 'worked' || p.role === 'faded' || p.role === 'independent';
          return (
            <article key={p.id} className="bank-item" id={p.id}>
              <header className="bank-item-head">
                <h2>
                  <span className="bank-id">{p.id}</span> {p.title}
                </h2>
                <span className="bank-role">{ROLE_LABEL[p.role]}</span>
              </header>
              <div className="bank-grid">
                <div>
                  <CodePanel problem={p} activeLine={null} activeSegment={null} activePhase={null} label={`Java code for ${p.id}`} />
                </div>
                <div className="bank-meta">
                  <p>{p.why}</p>
                  <dl>
                    <div>
                      <dt>Objectives</dt>
                      <dd>{p.objectives.join(', ')}</dd>
                    </div>
                    <div>
                      <dt>Targets</dt>
                      <dd>{p.targets.map((m) => `${m} ${MISCONCEPTIONS[m].name}`).join('; ')}</dd>
                    </div>
                    <div>
                      <dt>Trace</dt>
                      <dd>{traceSummary(p, t)}</dd>
                    </div>
                    {p.header && (
                      <div>
                        <dt>Task</dt>
                        <dd>
                          {p.header.prompt} Reference answer: <code className="ic">{condCode(p)}</code>.
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>OpenJDK</dt>
                      <dd>{st ? (st.match ? `match, ${st.steps} steps` : 'MISMATCH') : 'not checked in this build'}</dd>
                    </div>
                  </dl>
                  <div className="bank-actions">
                    {playable ? (
                      <a className="btn" href={href({ name: 'try', id: p.id })}>
                        Try it
                      </a>
                    ) : (
                      <span className="hint">Interaction scheduled for Milestone 2</span>
                    )}
                  </div>
                  <details>
                    <summary>Full trace</summary>
                    <div className="table-scroll">
                      <StaticTrace p={p} t={t} />
                    </div>
                  </details>
                  <details>
                    <summary>Java program that CI runs on OpenJDK</summary>
                    <pre className="javasrc">
                      <code>{instrumentedJava(p, p.id)}</code>
                    </pre>
                  </details>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="bank-section" aria-labelledby="fb">
        <h2 id="fb">Feedback messages</h2>
        <p>
          Each misconception is written once as a buggy rule. At every step LoopLens computes what a learner holding that misconception would answer; a matching wrong answer gets that misconception's message, filled in with the real values. Any other wrong answer gets a short explanation of the step itself.
        </p>
        <ol className="fb-list">
          {MISCONCEPTION_ORDER.map((id) => (
            <li key={id}>
              <h3>
                <span className="mc-id">{id}</span> {MISCONCEPTIONS[id].name}
              </h3>
              <p className="fb-belief">{MISCONCEPTIONS[id].belief}</p>
              <blockquote>
                <Rich text={ex[id].message} />
              </blockquote>
              <p className="note-rule">
                <span className="rule-label">Rule</span> <Rich text={MISCONCEPTIONS[id].rule} />
              </p>
            </li>
          ))}
        </ol>
        <details>
          <summary>Every message LoopLens can show on these problems ({variants.length}), each with a real example</summary>
          <table className="simple variants">
            <thead>
              <tr>
                <th scope="col">Variant</th>
                <th scope="col">Example</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.variant}>
                  <td>
                    <code>{v.variant}</code>
                    <div className="hint">{v.where}</div>
                  </td>
                  <td>
                    <Rich text={v.message} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="bank-section" aria-labelledby="log">
        <h2 id="log">Anonymous event log</h2>
        <p>
          Every prediction is recorded with the problem, step, answer, misconception label, and time taken. No names, no accounts.{' '}
          {remoteLogging() ? 'This build also sends events to the study spreadsheet.' : 'In this build events stay in this browser; sending them to the study spreadsheet is the next logging step.'}
        </p>
        {events.length === 0 ? (
          <p className="empty">
            No events in this browser yet. Predictions show up here as soon as you <a href={href({ name: 'orientation' })}>start the preview</a> or try a problem above.
          </p>
        ) : (
          <>
            <p>
              <strong>{events.length}</strong> events in this browser. The latest {Math.min(12, events.length)} are below.
            </p>
            <div className="table-scroll">
              <table className="simple log">
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Event</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events
                    .slice(-12)
                    .reverse()
                    .map((e) => (
                      <tr key={`${e.sid}-${e.seq}`}>
                        <td>{new Date(e.t).toLocaleTimeString()}</td>
                        <td>{e.type}</td>
                        <td>{describe(e)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="row-actions">
              <button type="button" className="btn" onClick={download}>
                Download as JSON
              </button>
              <button type="button" className="btn" onClick={copy}>
                Copy as JSON
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  const gone = clearLog();
                  setEvents([]);
                  setCleared(gone);
                  say(`Cleared ${gone.length} events from this browser.`);
                }}
              >
                Clear this browser's log
              </button>
            </div>
          </>
        )}
        {copied && (
          <p className="hint copied">
            {copied}{' '}
            {cleared && cleared.length > 0 && events.length === 0 && (
              <button
                type="button"
                className="btn-quiet btn-inline"
                onClick={() => {
                  restoreLog(cleared);
                  setEvents(readLog());
                  setCleared(null);
                  say(`Restored ${cleared.length} events.`);
                }}
              >
                Undo
              </button>
            )}
          </p>
        )}
      </section>
    </main>
  );
}
