import { describe, expect, it } from 'vitest';
import { byId } from '../content/problems';
import { expectedValue } from './diagnose';
import { activeRow, countVerdict, initSession, outputSoFar, score, sessionReducer, visibleRows, type SessionState } from './session';
import { simulate } from './simulate';
import type { Answer, Problem } from './types';

const P = (id: string) => byId(id) as Problem;

function correctAnswer(p: Problem, s: SessionState): Answer {
  const t = simulate(p);
  const slot = s.slots[s.cur];
  if (slot.kind === 'count') return { kind: 'number', value: t.passes };
  if (slot.kind === 'phase') return { kind: 'phase', value: t.rows[slot.row].phase };
  return expectedValue(p, t.rows[slot.row]);
}

describe('faded example (P02, Figure 1)', () => {
  const p = P('P02');
  const t = simulate(p);
  const run = (s: SessionState, a: Parameters<typeof sessionReducer>[3]) => sessionReducer(p, t, s, a);

  it('shows steps 1 to 8 worked out and asks from step 9', () => {
    const s = initSession(p, 'faded', t);
    const rows = visibleRows(t, s);
    expect(rows.filter((r) => r.given)).toHaveLength(8);
    expect(rows[rows.length - 1].asking).toBe('value');
    expect(t.rows[rows[rows.length - 1].r].step).toBe(9);
  });

  it('a wrong final update shows M4, then the explained check is filled in and the output is asked', () => {
    let s = initSession(p, 'faded', t);
    s = run(s, { type: 'answer', answer: { kind: 'number', value: 15 }, ms: 1000 }); // body, right
    expect(s.cur).toBe(1);
    s = run(s, { type: 'answer', answer: { kind: 'number', value: 8 }, ms: 1000 }); // update, M4
    expect(s.feedback).toBe(true);
    expect(s.records[1]?.verdict?.misconception).toBe('M4');
    // the code highlight stays on the update while the feedback is up
    expect(t.rows[activeRow(t, s) as number].phase).toBe('update');
    s = run(s, { type: 'continue' });
    expect(s.records[2]?.explained).toBe(true); // final check explained by the feedback
    expect(t.rows[s.slots[s.cur].row].phase).toBe('exit');
    expect(outputSoFar(t, s)).toBe('');
    s = run(s, { type: 'answer', answer: { kind: 'text', value: '15' }, ms: 1000 });
    expect(s.stage).toBe('done');
    expect(outputSoFar(t, s)).toBe('15\n');
    expect(score(s)).toEqual({ asked: 3, right: 2, misconceptions: [{ id: 'M4', count: 1 }] });
  });
});

describe('independent problem (P04)', () => {
  const p = P('P04');
  const t = simulate(p);

  it('asks for the pass count first, then a phase and a value for every step', () => {
    const s = initSession(p, 'independent', t);
    expect(s.slots[0].kind).toBe('count');
    expect(s.slots.filter((x) => x.kind === 'phase')).toHaveLength(t.rows.length - 1);
    expect(visibleRows(t, s)).toHaveLength(0);
  });

  it('a fully correct run ends with the count prediction confirmed', () => {
    let s = initSession(p, 'independent', t);
    let guard = 0;
    while (s.stage === 'trace' && guard++ < 100) s = sessionReducer(p, t, s, { type: 'answer', answer: correctAnswer(p, s), ms: 500 });
    expect(s.stage).toBe('done');
    expect(countVerdict(s)?.correct).toBe(true);
    const sc = score(s);
    expect(sc.right).toBe(sc.asked);
    expect(visibleRows(t, s).every((r) => r.phaseKnown && r.valueKnown)).toBe(true);
    expect(outputSoFar(t, s)).toBe('9\n');
  });

  it('a phase prediction hides the code highlight for the row being asked', () => {
    let s = initSession(p, 'independent', t);
    s = sessionReducer(p, t, s, { type: 'answer', answer: { kind: 'number', value: 5 }, ms: 500 }); // count: M1, revealed at the end
    s = sessionReducer(p, t, s, { type: 'answer', answer: { kind: 'number', value: 1 }, ms: 500 }); // init
    expect(s.slots[s.cur].kind).toBe('phase');
    expect(activeRow(t, s)).toBe(0); // still on initialize
    s = sessionReducer(p, t, s, { type: 'answer', answer: { kind: 'phase', value: 'body' }, ms: 500 }); // M3
    expect(s.records[s.cur]?.verdict?.variant).toBe('M3.checkFirst');
    expect(activeRow(t, s)).toBe(1);
  });
});

describe('worked example (P01)', () => {
  const p = P('P01');
  const t = simulate(p);
  it('steps through every row, then asks for a self explanation', () => {
    let s = initSession(p, 'worked', t);
    expect(s.shown).toBe(1);
    for (let k = 1; k < t.rows.length; k++) s = sessionReducer(p, t, s, { type: 'next' });
    expect(s.shown).toBe(t.rows.length);
    expect(s.stage).toBe('trace');
    s = sessionReducer(p, t, s, { type: 'next' });
    expect(s.stage).toBe('selfExplain');
    s = sessionReducer(p, t, s, { type: 'selfExplain', text: 'i became 4 and 4 <= 3 is false' });
    expect(s.stage).toBe('review');
    s = sessionReducer(p, t, s, { type: 'finish' });
    expect(s.stage).toBe('done');
  });
});

describe('Watch condition', () => {
  it('turns faded and independent problems into click through traces with nothing to predict', () => {
    for (const id of ['P02', 'P04']) {
      const p = P(id);
      const t = simulate(p);
      let s = initSession(p, 'watch', t);
      expect(s.slots).toHaveLength(0);
      for (let k = 0; k < t.rows.length; k++) s = sessionReducer(p, t, s, { type: 'next' });
      expect(s.stage).toBe('done');
    }
  });
});
