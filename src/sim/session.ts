// State machine for one problem attempt. Pure functions, so the whole
// interaction can be unit tested without a browser.

import { buildSlots, diagnose } from './diagnose';
import { simulate } from './simulate';
import type { Answer, Mode, Problem, Slot, Trace, Verdict } from './types';

export interface SlotRecord {
  answer: Answer | null;
  verdict: Verdict | null;
  /** filled in by an earlier feedback message instead of being asked */
  explained: boolean;
  ms: number;
}

export type Stage = 'trace' | 'selfExplain' | 'review' | 'done';

export interface SessionState {
  problemId: string;
  mode: Mode;
  slots: Slot[];
  records: (SlotRecord | null)[];
  /** index of the current slot; equals slots.length when every slot is done */
  cur: number;
  /** a wrong answer's feedback is on screen and waits for Continue */
  feedback: boolean;
  /** worked and watch modes: rows shown so far. Faded mode: rows worked out up front. */
  shown: number;
  stage: Stage;
  /** slot whose verdict note is on screen */
  noteSlot: number | null;
  selfText: string;
}

export type SessionAction =
  | { type: 'answer'; answer: Answer; ms: number }
  | { type: 'continue' }
  | { type: 'next' }
  | { type: 'selfExplain'; text: string }
  | { type: 'finish' };

export function modeFor(p: Problem, condition: 'predict' | 'watch'): Mode {
  if (p.role === 'worked') return 'worked';
  if (condition === 'watch') return 'watch';
  return p.role === 'faded' ? 'faded' : 'independent';
}

export function initSession(p: Problem, mode: Mode, t: Trace = simulate(p)): SessionState {
  const slots = buildSlots(p, t, mode);
  const shown = mode === 'faded' ? Math.max(1, (p.fadeFrom ?? 1) - 1) : mode === 'independent' ? 0 : 1;
  return {
    problemId: p.id,
    mode,
    slots,
    records: slots.map(() => null),
    cur: 0,
    feedback: false,
    shown,
    stage: 'trace',
    noteSlot: null,
    selfText: '',
  };
}

const isExitValue = (t: Trace, s: Slot) => s.kind === 'value' && t.rows[s.row].phase === 'exit';

const settle = (s: SessionState): SessionState => (s.cur < s.slots.length ? s : { ...s, stage: 'done' });

export function sessionReducer(p: Problem, t: Trace, s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case 'answer': {
      if (s.stage !== 'trace' || s.feedback || s.cur >= s.slots.length) return s;
      const slot = s.slots[s.cur];
      const verdict = diagnose(p, t, slot, a.answer);
      const records = s.records.slice();
      records[s.cur] = { answer: a.answer, verdict, explained: false, ms: a.ms };
      if (slot.kind === 'count') {
        // the count prediction is revealed at the end, after the trace has tested it
        return settle({ ...s, records, cur: s.cur + 1, noteSlot: null });
      }
      if (verdict.correct) return settle({ ...s, records, cur: s.cur + 1, noteSlot: verdict.message ? s.cur : null });
      return { ...s, records, feedback: true, noteSlot: s.cur };
    }
    case 'continue': {
      if (!s.feedback) return s;
      const v = s.records[s.cur]?.verdict;
      const records = s.records.slice();
      let cur = s.cur + 1;
      if (v?.explainsEnd) {
        while (cur < s.slots.length && !isExitValue(t, s.slots[cur])) {
          records[cur] = { answer: null, verdict: null, explained: true, ms: 0 };
          cur++;
        }
      }
      return settle({ ...s, records, cur, feedback: false, noteSlot: null });
    }
    case 'next': {
      if (s.mode !== 'worked' && s.mode !== 'watch') return s;
      if (s.stage !== 'trace') return s;
      if (s.shown < t.rows.length) return { ...s, shown: s.shown + 1 };
      if (s.mode === 'worked' && p.selfExplain) return { ...s, stage: 'selfExplain' };
      return { ...s, stage: 'done' };
    }
    case 'selfExplain':
      if (s.stage !== 'selfExplain') return s;
      return { ...s, selfText: a.text, stage: 'review' };
    case 'finish':
      if (s.stage === 'review') return { ...s, stage: 'done' };
      return s;
  }
}

// ---------------------------------------------------------------------------
// Views derived from the state

export interface RowView {
  /** index into trace.rows */
  r: number;
  phaseKnown: boolean;
  valueKnown: boolean;
  /** what is being asked about this row right now, if anything */
  asking: 'phase' | 'value' | null;
  /** worked out up front (faded examples) */
  given: boolean;
  phaseRecord: SlotRecord | null;
  valueRecord: SlotRecord | null;
}

export function slotIndex(s: SessionState, kind: 'phase' | 'value', r: number): number {
  return s.slots.findIndex((x) => x.kind === kind && x.row === r);
}

export function currentSlot(s: SessionState): Slot | null {
  return s.cur < s.slots.length ? s.slots[s.cur] : null;
}

export function visibleRows(t: Trace, s: SessionState): RowView[] {
  const views: RowView[] = [];
  if (s.mode === 'worked' || s.mode === 'watch') {
    for (let r = 0; r < s.shown; r++) views.push({ r, phaseKnown: true, valueKnown: true, asking: null, given: false, phaseRecord: null, valueRecord: null });
    return views;
  }
  const current = currentSlot(s);
  const open = current !== null && s.records[s.cur] === null;
  let lastRow: number;
  if (!current) lastRow = t.rows.length - 1;
  else lastRow = current.kind === 'count' ? -1 : current.row;
  if (s.mode === 'faded') lastRow = Math.max(lastRow, s.shown - 1);
  for (let r = 0; r <= lastRow; r++) {
    const pre = s.mode === 'faded' && r < s.shown;
    const pi = slotIndex(s, 'phase', r);
    const vi = slotIndex(s, 'value', r);
    const phaseKnown = pre || pi < 0 || s.records[pi] !== null;
    const valueKnown = pre || (vi >= 0 ? s.records[vi] !== null : phaseKnown);
    const asking = !pre && open && current && current.kind !== 'count' && current.row === r ? current.kind : null;
    views.push({
      r,
      phaseKnown,
      valueKnown,
      asking,
      given: pre,
      phaseRecord: pi >= 0 ? s.records[pi] : null,
      valueRecord: vi >= 0 ? s.records[vi] : null,
    });
  }
  return views;
}

/** Row whose code should be highlighted: the latest row whose phase is known. */
export function activeRow(t: Trace, s: SessionState): number | null {
  const rows = visibleRows(t, s);
  for (let k = rows.length - 1; k >= 0; k--) if (rows[k].phaseKnown) return rows[k].r;
  return null;
}

/** Program output so far: only from steps whose value is known. */
export function outputSoFar(t: Trace, s: SessionState): string {
  return visibleRows(t, s)
    .filter((v) => v.valueKnown)
    .map((v) => t.rows[v.r].out)
    .join('');
}

export interface Score {
  asked: number;
  right: number;
  misconceptions: { id: string; count: number }[];
}

/** Step predictions only; the pass count prediction is reported on its own (countVerdict). */
export function score(s: SessionState): Score {
  let asked = 0;
  let right = 0;
  const m = new Map<string, number>();
  s.records.forEach((rec, k) => {
    if (!rec || rec.explained || !rec.verdict || s.slots[k].kind === 'count') return;
    asked++;
    if (rec.verdict.correct) right++;
    else if (rec.verdict.misconception) m.set(rec.verdict.misconception, (m.get(rec.verdict.misconception) ?? 0) + 1);
  });
  return { asked, right, misconceptions: [...m.entries()].sort().map(([id, count]) => ({ id, count })) };
}

export function countVerdict(s: SessionState): Verdict | null {
  const k = s.slots.findIndex((x) => x.kind === 'count');
  return k >= 0 ? (s.records[k]?.verdict ?? null) : null;
}
