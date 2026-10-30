import { useEffect, useRef, useState } from 'react';
import { CheckIcon, DesignNote, revealNearest, Rich, SettleButton } from '../components/bits';
import { CodePanel, Console } from '../components/CodePanel';
import { TypedAnswer } from '../components/Inputs';
import { Ledger } from '../components/Ledger';
import { explainStep } from '../content/explain';
import { MISCONCEPTIONS } from '../content/feedback';
import { announce } from '../lib/announce';
import { PHASE_NAME } from '../sim/diagnose';
import { activeRow, countVerdict, outputSoFar, score, type SessionAction, type SessionState } from '../sim/session';
import type { Answer, MisconceptionId, Problem, Trace, Verdict } from '../sim/types';

export const MODE_LABEL = { worked: 'Worked example', faded: 'Faded example', independent: 'On your own', watch: 'Step through' } as const;

const plain = (x: string) => x.replace(/`/g, '');

function taskText(p: Problem, s: SessionState): string {
  switch (s.mode) {
    case 'worked':
      return 'Step through the trace and read why each step happens. Every step names its phase and shows the values Java uses.';
    case 'faded':
      return `Steps 1 to ${s.shown} are worked out for you. Read them, then predict the rest of the trace, one step at a time.`;
    case 'independent':
      return 'Predict how many times the body will run, then trace the loop yourself: pick the phase that runs next and predict what it does.';
    case 'watch':
      return p.role === 'worked' ? '' : 'Step through the trace one step at a time.';
  }
}

/** The misconceptions this attempt ran into, step predictions and pass count together. */
function caught(s: SessionState): MisconceptionId[] {
  const met = score(s).misconceptions.map((m) => m.id as MisconceptionId);
  const cv = countVerdict(s);
  if (cv && !cv.correct && cv.misconception && !met.includes(cv.misconception)) met.push(cv.misconception);
  return met.sort();
}

/** What a screen reader user hears when the state changes without a focus move. */
function announcement(p: Problem, t: Trace, s: SessionState): string {
  if (s.stage === 'trace') {
    if (s.mode === 'worked' || s.mode === 'watch') {
      const r = s.shown - 1;
      const row = t.rows[r];
      if (!row) return '';
      if (s.mode === 'worked') return `Step ${row.step}, ${PHASE_NAME[row.phase]}. ${plain(explainStep(p, t, r))}`;
      const out = row.out.trim();
      return `Step ${row.step}, ${PHASE_NAME[row.phase]} on line ${row.line}.${out ? ` It prints ${out}.` : ''}`;
    }
    if (s.feedback) {
      const v = s.records[s.cur]?.verdict;
      if (!v) return '';
      const m = v.misconception ? MISCONCEPTIONS[v.misconception] : null;
      return `${plain(v.message)}${m ? ` Rule: ${plain(m.rule)}` : ''}`;
    }
    if (s.noteSlot !== null) {
      const v = s.records[s.noteSlot]?.verdict;
      if (v?.correct && v.message) return plain(v.message);
    }
    return '';
  }
  if (s.stage === 'review' && p.selfExplain) return `One way to say it: ${plain(p.selfExplain.expert)}`;
  if (s.stage === 'done') {
    const parts = ['Problem complete.'];
    const cv = countVerdict(s);
    if (cv) parts.push(`You predicted the body would run ${cv.given} ${cv.given === '1' ? 'time' : 'times'}. ${plain(cv.message)}`);
    if (s.mode === 'faded' || s.mode === 'independent') {
      const sc = score(s);
      parts.push(`${sc.right} of ${sc.asked} step predictions right on the first try.`);
    }
    return parts.join(' ');
  }
  return '';
}

function CountResult({ v }: { v: Verdict }) {
  const m = v.misconception ? MISCONCEPTIONS[v.misconception] : null;
  return (
    <div className={`result ${v.correct ? 'is-right' : 'is-wrong'}`}>
      <p className="result-head">
        You predicted the body would run {v.given} {v.given === '1' ? 'time' : 'times'}.
      </p>
      {m && (
        <p className="note-tag">
          <span className="mc-id">{m.id}</span>
          <span>{m.name}</span>
        </p>
      )}
      <p>
        <Rich text={v.message} />
      </p>
      {m && (
        <p className="note-rule">
          <span className="rule-label">Rule</span> <Rich text={m.rule} />
        </p>
      )}
    </div>
  );
}

function SelfExplain({ prompt, onSave }: { prompt: string; onSave: (text: string) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const box = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    revealNearest(box.current);
  }, []);
  return (
    <form
      ref={box}
      className="selfx"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) {
          setErr('Write a sentence first, or choose Skip.');
          ref.current?.focus();
          return;
        }
        onSave(text.trim());
      }}
    >
      <label htmlFor="selfx-text" className="selfx-label">
        {prompt}
      </label>
      <textarea
        id="selfx-text"
        ref={ref}
        rows={3}
        value={text}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? 'selfx-err' : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setErr('');
        }}
        placeholder="The loop stopped because..."
      />
      {err && (
        <p id="selfx-err" className="field-err" role="alert">
          {err}
        </p>
      )}
      <div className="row-actions">
        <button type="submit" className="btn btn-primary">
          Save and compare
        </button>
        <button type="button" className="btn-quiet" onClick={() => onSave('')}>
          Skip
        </button>
      </div>
      <DesignNote cite="Chi 1989">Self explanation prompt: the step checker can't validate the "why", so the learner writes it.</DesignNote>
    </form>
  );
}

export function ProblemScreen({
  p,
  t,
  s,
  act,
  onNext,
  nextLabel,
  onRestart,
}: {
  p: Problem;
  t: Trace;
  s: SessionState;
  act: (a: SessionAction) => void;
  onNext: () => void;
  nextLabel: string;
  onRestart: () => void;
}) {
  const startedAt = useRef<{ cur: number; at: number }>({ cur: -1, at: performance.now() });
  if (startedAt.current.cur !== s.cur) startedAt.current = { cur: s.cur, at: performance.now() };
  const answer = (a: Answer) => act({ type: 'answer', answer: a, ms: Math.round(performance.now() - startedAt.current.at) });

  const ar = activeRow(t, s);
  const row = ar === null ? null : t.rows[ar];
  const out = outputSoFar(t, s);
  const countSlot = s.slots.findIndex((x) => x.kind === 'count');
  const countOpen = countSlot >= 0 && s.cur === countSlot;
  const counted = countSlot >= 0 && s.records[countSlot];
  const predictMode = s.mode === 'faded' || s.mode === 'independent';
  const stepping = s.mode === 'worked' || s.mode === 'watch';
  const sc = score(s);
  const cv = countVerdict(s);
  const met = caught(s);
  const task = taskText(p, s);
  const doneBox = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  // tell screen readers about changes that don't move focus
  useEffect(() => {
    const msg = announcement(p, t, s);
    if (msg) announce(msg);
  }, [s.cur, s.feedback, s.shown, s.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s.stage === 'review') revealNearest(reviewRef.current);
    const box = doneBox.current;
    if (s.stage === 'done' && box) {
      // show the whole box if it fits; otherwise make sure its button shows
      const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const col = box.closest<HTMLElement>('.col-left');
      const scrolls = col !== null && col.scrollHeight > col.clientHeight && getComputedStyle(col).overflowY !== 'visible';
      const room = scrolls ? col.clientHeight : window.innerHeight - 80;
      box.scrollIntoView({ block: box.offsetHeight <= room ? 'start' : 'end', behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [s.stage]);

  return (
    <main className="workspace" id="main">
      <div className="col-left">
        <header className="prob-head">
          <h1>{p.title}</h1>
          {task && <p className="prob-task">{task}</p>}
          {s.mode !== 'watch' && <DesignNote cite="Renkl 2003; Collins 1989">Worked example, then faded examples, then on your own: support is removed one step at a time.</DesignNote>}
          {s.mode === 'watch' && <DesignNote cite="Naps 2002; Hundhausen 2002">Watch condition for the evaluation: same problems and trace table, no predictions and no feedback.</DesignNote>}
        </header>

        <section className="panel panel-code" aria-label="Code and output">
          <CodePanel problem={p} activeLine={row?.line ?? null} activeSegment={row?.segment ?? null} activePhase={row?.phase ?? null} status />
          <Console text={out} placeholder={countOpen ? 'The program has not run yet' : 'Nothing printed yet'} />
          <DesignNote cite="Margulieux 2012; Morrison 2015">The running part of the code is highlighted and named with its phase: a subgoal label on every step.</DesignNote>
        </section>

        <section className="task" aria-label="Your task">
          {countOpen && (
            <div className="count">
              <p className="count-q">
                <strong>Before you trace:</strong> how many times will the body run?
              </p>
              <TypedAnswer formId={`count-${p.id}`} kind="number" label="Before you trace: how many times will the body run?" onAnswer={(raw) => answer({ kind: 'number', value: parseInt(raw, 10) })} submitLabel="Lock it in" size={4} reveal />
              <p className="hint">You'll find out at the end whether it holds up.</p>
              <DesignNote cite="Chi and Wylie 2014">Commit to a count first. A step trace does the counting for you, so M1 can only show up in a prediction like this one.</DesignNote>
            </div>
          )}
          {!countOpen && counted && s.stage === 'trace' && (
            <p className="count-locked">
              You predicted the body runs <strong>{(counted.answer as { value: number }).value}</strong> {(counted.answer as { value: number }).value === 1 ? 'time' : 'times'}. The trace will test it.
            </p>
          )}
          {s.stage === 'trace' && stepping && (
            <div className="progress-line">
              <span>
                Step {s.shown} of {t.rows.length}
              </span>
              <span className="meter" aria-hidden="true">
                <span style={{ width: `${(100 * s.shown) / t.rows.length}%` }} />
              </span>
            </div>
          )}
          {s.stage === 'selfExplain' && p.selfExplain && <SelfExplain prompt={p.selfExplain.prompt} onSave={(text) => act({ type: 'selfExplain', text })} />}
          {s.stage === 'review' && p.selfExplain && (
            <div className="review" ref={reviewRef}>
              {s.selfText ? (
                <>
                  <p className="review-label">You wrote</p>
                  <blockquote className="review-mine">{s.selfText}</blockquote>
                </>
              ) : null}
              <p className="review-label">One way to say it</p>
              <blockquote className="review-expert">
                <Rich text={p.selfExplain.expert} />
              </blockquote>
              <p className="hint">Did yours mention the last update and the false check? Those two steps are why the loop stops where it does.</p>
              <div className="row-actions">
                <SettleButton onClick={() => act({ type: 'finish' })} autoFocus>
                  Continue
                </SettleButton>
              </div>
            </div>
          )}
          {s.stage === 'done' && (
            <div className="done-box" ref={doneBox}>
              <h2 className="done-title">
                <CheckIcon size={22} />
                Problem complete
              </h2>
              {cv && <CountResult v={cv} />}
              {predictMode && (
                <p className="score">
                  <strong>
                    {sc.right} of {sc.asked}
                  </strong>{' '}
                  step predictions right on the first try{cv ? ', plus the pass count above' : ''}.
                </p>
              )}
              {predictMode && met.length > 0 && (
                <div className="met">
                  <p className="met-head">Caught on this problem</p>
                  <ul className="met-list">
                    {met.map((id) => (
                      <li key={id}>
                        <span className="mc-id">{id}</span> {MISCONCEPTIONS[id].name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {predictMode && met.length === 0 && <p className="met-none">No misconceptions showed up on this one.</p>}
              {stepping && <p className="met-none">You stepped through all {t.rows.length} steps.</p>}
              <div className="row-actions">
                <SettleButton onClick={onNext} autoFocus>
                  {nextLabel}
                </SettleButton>
              </div>
            </div>
          )}
          <button type="button" className="btn-quiet restart" onClick={onRestart}>
            Restart this problem
          </button>
        </section>
      </div>

      <div className="panel panel-trace">
        <div className="panel-notes">
          <DesignNote cite="Sweller 1998">The trace table holds every value, so working memory doesn't have to.</DesignNote>
          {predictMode && <DesignNote cite="Chi and Wylie 2014; Naps 2002; Hundhausen 2002">Predict before Java reveals the step: constructive, not just active, engagement.</DesignNote>}
        </div>
        <Ledger p={p} t={t} s={s} onAnswer={answer} onContinue={() => act({ type: 'continue' })} onNext={() => act({ type: 'next' })} />
      </div>
    </main>
  );
}
