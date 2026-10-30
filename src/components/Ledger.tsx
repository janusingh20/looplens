import { useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { explainStep } from '../content/explain';
import { MISCONCEPTIONS } from '../content/feedback';
import { bodyCode, condCode, initCode, updCode } from '../sim/codegen';
import { PHASE_NAME, valueColumn, valueKind } from '../sim/diagnose';
import { currentSlot, visibleRows, type RowView, type SessionState, type SlotRecord } from '../sim/session';
import type { Answer, Phase, Problem, Row, Trace, Verdict } from '../sim/types';
import { DesignNote, fromControl, fromTyping, Kbd, PhaseMark, Rich, SettleButton, useKeys } from './bits';
import { BoolChoice, PHASE_KEYS, PHASE_ORDER, PhaseChoice, TypedAnswer } from './Inputs';

// The trace table is where everything happens, like a desk check on paper:
// the learner fills in the next cell, and a wrong prediction stays on the
// page, boxed and struck through, next to what Java actually does.

type Col = string; // loop variable, 'cond', an accumulator name, or 'out'

function columns(p: Problem): { key: Col; label: ReactNode; numeric: boolean }[] {
  return [
    { key: p.v, label: <code>{p.v}</code>, numeric: true },
    { key: 'cond', label: <code>{condCode(p)}</code>, numeric: false },
    ...p.decls.map((d) => ({ key: d.name, label: <code>{d.name}</code>, numeric: true })),
    { key: 'out', label: 'Output', numeric: false },
  ];
}

function cellValue(p: Problem, row: Row, col: Col): string {
  if (col === p.v) return row.i === null ? '' : String(row.i);
  if (col === 'cond') return row.cond === null ? '' : String(row.cond);
  if (col === 'out') return row.out.trim();
  return col in row.vars ? String(row.vars[col]) : '';
}

/** Does this column carry a value on this row (shown muted when it is not the value that changed)? */
function carries(p: Problem, row: Row, col: Col): boolean {
  if (col === 'cond') return row.phase === 'check';
  if (col === 'out') return row.out.trim() !== '';
  if (col === p.v) return row.phase !== 'exit';
  return true;
}

export function questionFor(p: Problem, row: Row): string {
  switch (row.phase) {
    case 'init':
      return `What is \`${p.v}\` after \`${initCode(p)}\`?`;
    case 'check':
      return `Is \`${condCode(p)}\` true or false right now?`;
    case 'body':
      return p.body.kind === 'print' ? `What does this pass print?` : `What is \`${p.body.target}\` after \`${bodyCode(p).replace(/;$/, '')}\`?`;
    case 'update':
      return `What is \`${p.v}\` after \`${updCode(p)}\`?`;
    case 'exit':
      return `What does line ${row.line} print?`;
  }
}

const plain = (s: string) => s.replace(/`/g, '');

function hintFor(kind: 'number' | 'bool' | 'text'): ReactNode {
  if (kind === 'bool')
    return (
      <>
        Press <Kbd>T</Kbd> or <Kbd>F</Kbd>
      </>
    );
  return (
    <>
      Type it, then press <Kbd>Enter</Kbd>
    </>
  );
}

function Mark({ rec, value }: { rec: SlotRecord | null; value: string }) {
  if (!rec || rec.explained || !rec.verdict) return <span className="val is-changed">{value}</span>;
  if (rec.verdict.correct)
    return (
      <span className="val is-changed">
        {value}
        <svg className="tick" width="14" height="14" viewBox="0 0 14 14" role="img" aria-label="predicted correctly">
          <path d="M2.5 7.5 5.6 10.4 11.5 3.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  return (
    <span className="val is-changed">
      <span className="was" aria-label={`you predicted ${rec.verdict.given}`}>
        <s>{rec.verdict.given}</s>
      </span>
      {value}
    </span>
  );
}

function WrongPhase({ rec }: { rec: SlotRecord | null }) {
  if (!rec?.verdict || rec.verdict.correct) return null;
  return (
    <span className="was" aria-label={`you predicted ${rec.verdict.given}`}>
      <s>{rec.verdict.given}</s>
    </span>
  );
}

function NoteTag({ verdict, phase }: { verdict: Verdict; phase: Phase }) {
  if (verdict.misconception) {
    const m = MISCONCEPTIONS[verdict.misconception];
    return (
      <div className="note-tag">
        <span className="mc-id">{m.id}</span>
        <span>{m.name}</span>
      </div>
    );
  }
  return (
    <div className="note-tag">
      <PhaseMark phase={phase} />
    </div>
  );
}

export interface LedgerProps {
  p: Problem;
  t: Trace;
  s: SessionState;
  onAnswer: (a: Answer) => void;
  onContinue: () => void;
  onNext: () => void;
}

export function Ledger({ p, t, s, onAnswer, onContinue, onNext }: LedgerProps) {
  const cols = columns(p);
  const width = cols.length + 2;
  const views = visibleRows(t, s);
  const current = currentSlot(s);
  const anchor = useRef<HTMLTableRowElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const stepping = s.mode === 'worked' || s.mode === 'watch';
  const open = current !== null && current.kind !== 'count' && !s.feedback && s.stage === 'trace' && s.records[s.cur] === null;

  // keep the newest row and its note in view
  useLayoutEffect(() => {
    const el = anchor.current ?? wrap.current?.querySelector<HTMLElement>('tbody tr:last-child');
    const box = wrap.current;
    if (!el || !box) return;
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    // On a narrow screen the table scrolls sideways: bring the answer cell into
    // view. The question itself is pinned to the left edge, so it stays put.
    if (box.scrollWidth > box.clientWidth + 1) {
      const cell = box.querySelector<HTMLElement>('td.is-input');
      if (cell) {
        const cr = cell.getBoundingClientRect();
        const br = box.getBoundingClientRect();
        if (cr.right > br.right - 8) box.scrollLeft += cr.right - br.right + 16;
        else if (cr.left < br.left + 8) box.scrollLeft -= br.left - cr.left + 16;
      } else {
        box.scrollLeft = 0;
      }
    }
    const er = el.getBoundingClientRect();
    if (box.scrollHeight > box.clientHeight + 1) {
      // the table scrolls inside its panel (wide screens)
      const br = box.getBoundingClientRect();
      if (er.bottom > br.bottom - 8) box.scrollBy({ top: er.bottom - br.bottom + 20, behavior });
    } else {
      // the page scrolls (narrow screens): move it only vertically, and never past the note's top
      const top = 80;
      const vh = window.innerHeight;
      if (er.bottom > vh - 8) window.scrollBy({ top: Math.min(er.bottom - vh + 20, er.top - top), behavior });
      else if (er.top < top) window.scrollBy({ top: er.top - top, behavior });
    }
  }, [s.cur, s.shown, s.feedback, s.stage]);

  // Enter, Space, and the right arrow step through a worked example; Enter
  // continues after feedback. None of these are character keys, so they can
  // stay on the page.
  useKeys(
    (e) => {
      if (stepping && s.stage === 'trace') {
        if (e.key === 'ArrowRight' && !fromTyping(e)) {
          onNext();
          return true;
        }
        if ((e.key === 'Enter' || e.key === ' ') && !fromControl(e)) {
          onNext();
          return true;
        }
      }
      if (s.feedback && e.key === 'Enter' && !fromControl(e)) {
        onContinue();
        return true;
      }
    },
    s.stage === 'trace',
  );

  // Letter keys answer, but only while focus is inside the trace table.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open || !current || e.altKey || e.ctrlKey || e.metaKey || fromTyping(e.nativeEvent)) return;
    const k = e.key.toUpperCase();
    if (current.kind === 'phase') {
      const hit = PHASE_ORDER.find((ph) => PHASE_KEYS[ph] === k);
      if (hit) {
        e.preventDefault();
        onAnswer({ kind: 'phase', value: hit });
      }
      return;
    }
    if (current.kind === 'value' && valueKind(p, t.rows[current.row]) === 'bool' && (k === 'T' || k === 'F')) {
      e.preventDefault();
      onAnswer({ kind: 'bool', value: k === 'T' });
    }
  };

  const positiveNote = s.noteSlot !== null && s.records[s.noteSlot]?.verdict?.correct ? (s.records[s.noteSlot]?.verdict?.message ?? '') : '';

  const renderRow = (v: RowView, latest: boolean) => {
    const row = t.rows[v.r];
    const key = `r${v.r}`;
    if (v.asking === 'phase') {
      return (
        <tr key={key} className="row row-ask is-asking is-latest">
          <td className="c-step">{row.step}</td>
          <td colSpan={width - 1}>
            <div className="ask">
              {positiveNote && (
                <p className="note-right">
                  <Rich text={positiveNote} />
                </p>
              )}
              <p className="ask-q">What runs next?</p>
              <PhaseChoice onAnswer={(value) => onAnswer({ kind: 'phase', value })} />
            </div>
          </td>
        </tr>
      );
    }
    const vcol = valueColumn(p, row);
    const kind = valueKind(p, row);
    const formId = `slot-${s.problemId}-${s.cur}`;
    return (
      <tr key={key} className={`row ph-${row.phase}${v.asking ? ' is-asking' : ''}${v.given ? ' is-given' : ''}${latest ? ' is-latest' : ''}`}>
        <td className="c-step">{row.step}</td>
        <td className="c-phase">
          <WrongPhase rec={v.phaseRecord} />
          <PhaseMark phase={row.phase} />
        </td>
        {cols.map((c) => {
          const isValue = c.key === vcol;
          const cls = `c-val${c.numeric ? ' is-num' : ''}${isValue && v.asking === 'value' ? ' is-input' : ''}`;
          if (isValue) {
            if (v.asking === 'value') {
              const label = `Step ${row.step}, ${PHASE_NAME[row.phase]}. ${plain(questionFor(p, row))}`;
              return (
                <td key={c.key} className={cls}>
                  {kind === 'bool' ? (
                    <BoolChoice label={label} onAnswer={(value) => onAnswer({ kind: 'bool', value })} />
                  ) : (
                    <TypedAnswer
                      formId={formId}
                      kind={kind}
                      label={label}
                      size={kind === 'text' ? 8 : 4}
                      onAnswer={(raw) => onAnswer(kind === 'number' ? { kind: 'number', value: parseInt(raw, 10) } : { kind: 'text', value: raw })}
                    />
                  )}
                </td>
              );
            }
            if (!v.valueKnown)
              return (
                <td key={c.key} className={cls}>
                  <span className="val is-unknown">?</span>
                </td>
              );
            return (
              <td key={c.key} className={cls}>
                <Mark rec={v.valueRecord} value={cellValue(p, row, c.key)} />
              </td>
            );
          }
          const show = carries(p, row, c.key) && !(c.key === 'out' && !v.valueKnown);
          return (
            <td key={c.key} className={cls}>
              {show ? <span className="val is-carried">{cellValue(p, row, c.key)}</span> : null}
            </td>
          );
        })}
      </tr>
    );
  };

  // the note row that follows the newest row
  let note: ReactNode = null;
  const last = views[views.length - 1];
  if (stepping && s.stage === 'trace' && last) {
    const row = t.rows[last.r];
    const more = s.shown < t.rows.length;
    note = (
      <tr key={`step-${last.r}`} ref={anchor} className={`row-note ${s.mode === 'worked' ? `is-explain ph-${row.phase}` : 'is-watch'}`}>
        <td />
        <td colSpan={width - 1}>
          <div className="note">
            {s.mode === 'worked' && (
              <p className="note-msg">
                <Rich text={explainStep(p, t, last.r)} />
              </p>
            )}
            <div className="note-actions">
              <SettleButton onClick={onNext} autoFocus settle={200}>
                {more ? 'Next step' : s.mode === 'worked' ? 'Finish the example' : 'Finish'}
              </SettleButton>
              <span className="hint">
                <Kbd>Enter</Kbd> or <Kbd>Space</Kbd>
              </span>
            </div>
          </div>
        </td>
      </tr>
    );
  } else if (s.feedback && current && current.kind !== 'count') {
    const rec = s.records[s.cur];
    const row = t.rows[current.row];
    if (rec?.verdict) {
      const m = rec.verdict.misconception ? MISCONCEPTIONS[rec.verdict.misconception] : null;
      note = (
        <tr key={`wrong-${s.cur}`} ref={anchor} className="row-note is-wrong">
          <td />
          <td colSpan={width - 1}>
            <div className="note">
              <DesignNote cite="VanLehn 2011; Aleven 2009; Hattie 2007">Step level feedback from authored wrong steps (example tracing). It names the misconception and explains the process, not just the answer.</DesignNote>
              <NoteTag verdict={rec.verdict} phase={row.phase} />
              <p className="note-msg">
                <Rich text={rec.verdict.message} />
              </p>
              {m && (
                <p className="note-rule">
                  <span className="rule-label">Rule</span> <Rich text={m.rule} />
                </p>
              )}
              <div className="note-actions">
                <SettleButton onClick={onContinue} autoFocus>
                  Continue
                </SettleButton>
                <span className="hint">
                  <Kbd>Enter</Kbd>
                </span>
              </div>
            </div>
          </td>
        </tr>
      );
    }
  } else if (current && current.kind === 'value' && !s.feedback) {
    const row = t.rows[current.row];
    const kind = valueKind(p, row);
    note = (
      <tr key={`ask-${s.cur}`} ref={anchor} className="row-note is-prompt">
        <td />
        <td colSpan={width - 1}>
          <div className="note">
            {positiveNote && (
              <p className="note-right">
                <Rich text={positiveNote} />
              </p>
            )}
            <p className="prompt">
              <Rich text={questionFor(p, row)} />
            </p>
            <div className="note-actions">
              {kind !== 'bool' && (
                <button type="submit" form={`slot-${s.problemId}-${s.cur}`} className="btn btn-primary">
                  Check
                </button>
              )}
              <span className="hint">{hintFor(kind)}</span>
            </div>
          </div>
        </td>
      </tr>
    );
  } else if (!current && positiveNote && s.mode !== 'worked') {
    note = (
      <tr key="end" ref={anchor} className="row-note is-prompt">
        <td />
        <td colSpan={width - 1}>
          <div className="note">
            <p className="note-right">
              <Rich text={positiveNote} />
            </p>
          </div>
        </td>
      </tr>
    );
  }

  // in a faded example, a rule marks where the worked steps end
  const sepAfter = s.mode === 'faded' && s.shown > 0 && s.shown < t.rows.length ? s.shown - 1 : -1;
  const sep = (
    <tr key="sep" className="row-sep">
      <td colSpan={width}>
        <span>
          Your predictions start at step {s.shown + 1}
        </span>
      </td>
    </tr>
  );

  const body: ReactNode[] = [];
  views.forEach((v, k) => {
    const latest = k === views.length - 1;
    body.push(renderRow(v, latest));
    if (v.r === sepAfter) body.push(sep);
    // the anchor note goes right after the row it talks about
    const noteHere =
      note &&
      ((stepping && latest) ||
        (s.feedback && current && current.kind !== 'count' && current.row === v.r) ||
        (!s.feedback && current && current.kind === 'value' && current.row === v.r) ||
        (!current && latest));
    if (noteHere) body.push(note);
  });

  return (
    <div className="ledger-wrap" ref={wrap} tabIndex={0} role="region" aria-label="Trace table" onKeyDown={onKeyDown}>
      <table className="ledger">
        <caption className="sr-only">Trace of the loop, one row per step</caption>
        <thead>
          <tr>
            <th scope="col" className="c-step">
              Step
            </th>
            <th scope="col" className="c-phase">
              Phase
            </th>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={`c-val${c.numeric ? ' is-num' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body}
          {views.length === 0 && (
            <tr className="row-empty">
              <td colSpan={width}>The trace starts after your prediction.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** A finished trace with every value shown, for the problem bank. */
export function StaticTrace({ p, t }: { p: Problem; t: Trace }) {
  const cols = columns(p);
  return (
    <table className="ledger is-static">
      <thead>
        <tr>
          <th scope="col" className="c-step">
            Step
          </th>
          <th scope="col" className="c-phase">
            Phase
          </th>
          {cols.map((c) => (
            <th key={c.key} scope="col" className={`c-val${c.numeric ? ' is-num' : ''}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {t.rows.map((row) => {
          const vcol = valueColumn(p, row);
          return (
            <tr key={row.step} className={`row ph-${row.phase}`}>
              <td className="c-step">{row.step}</td>
              <td className="c-phase">
                <PhaseMark phase={row.phase} />
              </td>
              {cols.map((c) => (
                <td key={c.key} className={`c-val${c.numeric ? ' is-num' : ''}`}>
                  {c.key === vcol ? <span className="val is-changed">{cellValue(p, row, c.key)}</span> : carries(p, row, c.key) ? <span className="val is-carried">{cellValue(p, row, c.key)}</span> : null}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
