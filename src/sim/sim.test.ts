import { describe, expect, it } from 'vitest';
import { PROBLEMS, SLICE, byId } from '../content/problems';
import { MESSAGES, MISCONCEPTION_ORDER } from '../content/feedback';
import { displayText } from './codegen';
import { buildSlots, diagnose, diagnoseCount, diagnosePhase, diagnoseValue, expectedValue, PHASES } from './diagnose';
import { simulate, transcript } from './simulate';
import type { Answer, MisconceptionId, Problem } from './types';

const P = (id: string): Problem => {
  const p = byId(id);
  if (!p) throw new Error(`missing ${id}`);
  return p;
};
const num = (value: number): Answer => ({ kind: 'number', value });
const bool = (value: boolean): Answer => ({ kind: 'bool', value });
const rowOf = (p: Problem, step: number) => simulate(p).rows.findIndex((r) => r.step === step);

describe('simulator', () => {
  it('traces the Figure 1 loop exactly', () => {
    const p = P('P02');
    const t = simulate(p);
    expect(displayText(p)).toBe('int sum = 0;\nfor (int i = 2; i < 10; i += 3) {\n    sum = sum + i;\n}\nSystem.out.println(sum);');
    expect(t.rows.map((r) => r.phase).join(' ')).toBe('init check body update check body update check body update check exit');
    expect(t.bodyValues).toEqual([2, 5, 8]);
    expect(t.finalI).toBe(11);
    expect(t.finalVars.sum).toBe(15);
    expect(t.output).toBe('15\n');
    expect(transcript(p, t).split('\n').slice(-3)).toEqual(['UPDATE i=11 | sum=15 | out=""', 'CHECK i=11 false | sum=15 | out=""', 'AFTER | sum=15 | out="15\\n"']);
  });

  it('handles countdowns, multiplication, and zero pass loops', () => {
    expect(simulate(P('P05')).bodyValues).toEqual([10, 7, 4, 1]);
    expect(simulate(P('P05')).finalI).toBe(-2);
    expect(simulate(P('P05')).output).toBe('10 7 4 1 ');
    expect(simulate(P('P07')).bodyValues).toEqual([1, 3, 9]);
    expect(simulate(P('P07')).finalI).toBe(27);
    expect(simulate(P('P08')).passes).toBe(0);
    expect(simulate(P('P08')).rows.map((r) => r.phase)).toEqual(['init', 'check', 'exit']);
    expect(simulate(P('P14')).output).toBe('1\n');
  });

  it('marks the boundary steps', () => {
    const t = simulate(P('P02'));
    expect(t.rows.find((r) => r.finalUpdate)?.step).toBe(10);
    expect(t.rows.find((r) => r.finalCheck)?.step).toBe(11);
    expect(t.rows.find((r) => r.lastBody)?.step).toBe(9);
    expect(t.rows.find((r) => r.firstCheck)?.step).toBe(2);
  });
});

describe('problem bank', () => {
  it('has 14 problems in the planned sequence', () => {
    expect(PROBLEMS).toHaveLength(14);
    expect(PROBLEMS.map((p) => p.role)).toEqual([
      'worked', 'faded', 'faded',
      'independent', 'independent', 'independent', 'independent', 'independent', 'independent',
      'header', 'header',
      'checkpoint', 'checkpoint', 'checkpoint',
    ]);
    expect(new Set(PROBLEMS.map((p) => p.id)).size).toBe(14);
    expect(SLICE.map((id) => P(id).role)).toEqual(['worked', 'faded', 'faded', 'independent']);
  });

  it('keeps every traced problem short enough for a one to two minute session (C1)', () => {
    for (const p of PROBLEMS) {
      const t = simulate(p);
      if (p.role === 'checkpoint') expect(t.passes).toBeLessThanOrEqual(5);
      else expect(t.passes, p.id).toBeLessThanOrEqual(4);
    }
  });

  it('covers every objective and every misconception', () => {
    for (const lo of ['LO1', 'LO2', 'LO3', 'LO4', 'LO5']) expect(PROBLEMS.some((p) => p.objectives.includes(lo as never)), lo).toBe(true);
    for (const m of MISCONCEPTION_ORDER) expect(PROBLEMS.some((p) => p.targets.includes(m)), m).toBe(true);
  });

  it('header problems: the reference header produces exactly the target values', () => {
    for (const p of PROBLEMS.filter((x) => x.role === 'header')) {
      expect(simulate(p).bodyValues, p.id).toEqual(p.header?.values);
    }
  });

  it('faded examples ask only for the steps after the worked part (backward fading)', () => {
    const p2 = P('P02');
    const s2 = buildSlots(p2, simulate(p2), 'faded');
    expect(s2.map((s) => simulate(p2).rows[s.row].step)).toEqual([9, 10, 11, 12]);
    const p3 = P('P03');
    const s3 = buildSlots(p3, simulate(p3), 'faded');
    expect(s3.length).toBeGreaterThan(s2.length);
  });
});

describe('misconception diagnosis', () => {
  it('Figure 1: predicting that i stays at 8 is M4, and the message matches the proposal', () => {
    const p = P('P02');
    const t = simulate(p);
    const v = diagnoseValue(p, t, rowOf(p, 10), num(8));
    expect(v.correct).toBe(false);
    expect(v.misconception).toBe('M4');
    expect(v.message).toBe(
      'Not quite. The update `i += 3` runs after every pass through the body, including the last one, so `i` becomes 11. Only then is `11 < 10` checked; it is false, so the loop ends and `sum` stays 15.',
    );
    expect(v.explainsEnd).toBe(true);
    expect(diagnoseValue(p, t, rowOf(p, 10), num(10)).variant).toBe('M4.stopsAtBound');
    expect(diagnoseValue(p, t, rowOf(p, 10), num(11)).correct).toBe(true);
  });

  it('M2: < treated like <= at the bound, and <= treated like <', () => {
    const p6 = P('P06');
    const t6 = simulate(p6);
    expect(diagnoseValue(p6, t6, t6.rows.findIndex((r) => r.finalCheck), bool(true)).misconception).toBe('M2');
    const p3 = P('P03');
    const t3 = simulate(p3);
    const boundary = t3.rows.findIndex((r) => r.phase === 'check' && r.i === 10);
    expect(diagnoseValue(p3, t3, boundary, bool(false)).variant).toBe('M2.inclusiveAsStrict');
    expect(diagnoseValue(p3, t3, boundary, bool(true)).variant).toBe('right.boundIncluded');
  });

  it('M1 and M2 in the pass count', () => {
    const p = P('P04');
    const t = simulate(p);
    expect(diagnoseCount(p, t, 3).correct).toBe(true);
    expect(diagnoseCount(p, t, 5).misconception).toBe('M1');
    expect(diagnoseCount(p, t, 2).misconception).toBe('M2');
    expect(diagnoseCount(p, t, 7).misconception).toBe(null);
    expect(diagnoseCount(P('P06'), simulate(P('P06')), 16).misconception).toBe('M1');
    expect(diagnoseCount(P('P07'), simulate(P('P07')), 9).misconception).toBe('M1');
  });

  it('M3: phases out of order, and a body that uses the updated value', () => {
    const p = P('P04');
    const t = simulate(p);
    expect(diagnosePhase(p, t, 1, 'body').variant).toBe('M3.checkFirst');
    expect(diagnosePhase(p, t, 3, 'check').variant).toBe('M3.updateBeforeCheck');
    expect(diagnosePhase(p, t, 4, 'body').variant).toBe('M3.checkEveryPass');
    expect(diagnoseValue(p, t, 0, num(3)).variant).toBe('M3.updateFirst');
    expect(diagnoseValue(p, t, 2, num(3)).variant).toBe('M3.bodyUsesUpdatedI');
  });

  it('M4: ending the loop right after the last body', () => {
    const p = P('P04');
    const t = simulate(p);
    const afterLastBody = t.rows.findIndex((r) => r.finalUpdate);
    expect(diagnosePhase(p, t, afterLastBody, 'exit').variant).toBe('M4.updateOnLastPass');
  });

  it('M5: a loop that never runs', () => {
    const p = P('P08');
    const t = simulate(p);
    expect(diagnoseValue(p, t, 1, bool(true)).misconception).toBe('M5');
    expect(diagnoseValue(p, t, 1, bool(true)).explainsEnd).toBe(true);
    expect(diagnoseCount(p, t, 1).misconception).toBe('M5');
    expect(diagnosePhase(p, t, 2, 'body').variant).toBe('M5.zeroPasses');
  });

  it('each misconception produces its own feedback somewhere in the bank', () => {
    const hit = new Set<MisconceptionId>();
    for (const p of PROBLEMS.filter((x) => x.role !== 'checkpoint' && x.role !== 'header')) {
      const t = simulate(p);
      for (const slot of buildSlots(p, t, 'independent')) {
        for (const a of candidateAnswers(p, slot)) {
          const v = diagnose(p, t, slot, a);
          if (v.misconception) hit.add(v.misconception);
        }
      }
    }
    expect([...hit].sort()).toEqual(['M1', 'M2', 'M3', 'M4', 'M5']);
  });

  it('every message renders cleanly for every step of every problem', () => {
    for (const p of PROBLEMS) {
      const t = simulate(p);
      for (const slot of buildSlots(p, t, 'independent')) {
        for (const a of candidateAnswers(p, slot)) {
          const v = diagnose(p, t, slot, a);
          expect(v.message, `${p.id} ${v.variant}`).not.toMatch(/undefined|null|NaN|\[object/);
          if (!v.correct) {
            expect(v.message.startsWith('Not quite.'), `${p.id} ${v.variant}`).toBe(true);
            expect(MESSAGES[v.variant], v.variant).toBeDefined();
          }
          expect(v.message, `${p.id} ${v.variant}`).not.toMatch(/[–—]/);
        }
      }
    }
  });

  it('a note on a right answer never gives away the step that comes next', () => {
    for (const p of PROBLEMS.filter((x) => x.role !== 'checkpoint' && x.role !== 'header')) {
      const t = simulate(p);
      for (const slot of buildSlots(p, t, 'independent')) {
        if (slot.kind === 'count') continue;
        for (const a of candidateAnswers(p, slot)) {
          const v = diagnose(p, t, slot, a);
          if (!v.correct || !v.message) continue;
          expect(v.message, `${p.id} ${v.variant}`).not.toMatch(/loop ends|body runs|body never|never runs|last pass|so the body|exit/i);
        }
      }
    }
  });

  it('messages stay true at the bound (QA on P06, P05, P08, P09)', () => {
    const p6 = P('P06');
    const t6 = simulate(p6);
    // i += 4 takes 12 to 16, which is the bound, not past it
    const upd = diagnoseValue(p6, t6, t6.rows.findIndex((r) => r.finalUpdate), num(15));
    expect(upd.variant).toBe('M4.stopsAtBound');
    expect(upd.message).not.toMatch(/past/);
    // i does reach 16; the body just never runs with it
    const count = diagnoseCount(p6, t6, 5);
    expect(count.variant).toBe('M2.count');
    expect(count.message).not.toMatch(/stops before/);
    expect(count.message).toContain('the body never runs with `i` = 16');
    // a countdown talks about its start, not its bound
    const p5 = P('P05');
    expect(diagnoseCount(p5, simulate(p5), 10).message).toContain('The start, 10');
    // a check that was false from the start doesn't say "again" or "once more"
    const p8 = P('P08');
    expect(diagnosePhase(p8, simulate(p8), 2, 'update').message).not.toMatch(/again/);
    const p9 = P('P09');
    const t9 = simulate(p9);
    const first = t9.rows.findIndex((r) => r.firstCheck);
    const v9 = diagnoseValue(p9, t9, first, bool(!t9.rows[first].cond));
    expect(v9.message).not.toMatch(/once more/);
  });
});

function candidateAnswers(p: Problem, slot: ReturnType<typeof buildSlots>[number]): Answer[] {
  const t = simulate(p);
  if (slot.kind === 'count') return [0, 1, 2, 3, 4, 5, 6, 9, 10, 16, Math.abs(p.bound), Math.abs(p.start)].map(num);
  if (slot.kind === 'phase') return PHASES.map((value) => ({ kind: 'phase', value }));
  const row = t.rows[slot.row];
  const e = expectedValue(p, row);
  if (e.kind === 'bool') return [bool(true), bool(false)];
  if (e.kind === 'text') return [e, { kind: 'text', value: 'nope' }, { kind: 'text', value: '0' }, { kind: 'text', value: String(Number(e.value) + 1) }];
  if (e.kind !== 'number') return [e];
  const out = new Set<number>([e.value, e.value + 1, e.value - 1, row.iBefore ?? 0, p.bound, p.bound - 1, p.bound + 1, p.start]);
  return [...out].map(num);
}
