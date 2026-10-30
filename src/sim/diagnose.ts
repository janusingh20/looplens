// Example tracing with a bug library.
//
// For every step, LoopLens knows the correct answer (from the simulator) and
// the answer a learner holding each misconception would give (buggy rules
// M1 to M5, applied to the true state at that step). A wrong answer that
// matches a buggy rule gets that misconception's message; any other wrong
// answer gets a short explanation of the step itself. This is the example
// tracing idea from Aleven et al. (2009): authored correct and incorrect
// steps, no cognitive model. The incorrect steps are authored once per
// misconception instead of once per problem.

import { bodyCode, condCode, initCode, updCode } from './codegen';
import { applyBody, applyUpdate, compare, countsUp, flipStrictness, simulate } from './simulate';
import type { Answer, MisconceptionId, Phase, Problem, Row, Slot, Trace, Verdict } from './types';
import { MESSAGES, type Ctx } from '../content/feedback';

export const PHASES: Phase[] = ['init', 'check', 'body', 'update', 'exit'];

export const PHASE_NAME: Record<Phase, string> = {
  init: 'initialize',
  check: 'check',
  body: 'body',
  update: 'update',
  exit: 'exit',
};

// ---------------------------------------------------------------------------
// Slots: which predictions a mode asks for, in order.

/** Can the value of this row be predicted? (An exit row only has a value when something prints after the loop.) */
export function askable(p: Problem, row: Row): boolean {
  return row.phase !== 'exit' || p.after.length > 0;
}

export function buildSlots(p: Problem, t: Trace, mode: 'worked' | 'faded' | 'independent' | 'watch'): Slot[] {
  const slots: Slot[] = [];
  if (mode === 'worked' || mode === 'watch') return slots;
  if (mode === 'faded') {
    const from = Math.max(1, (p.fadeFrom ?? 1) - 1);
    for (let r = from; r < t.rows.length; r++) {
      if (askable(p, t.rows[r])) slots.push({ kind: 'value', row: r });
    }
    return slots;
  }
  slots.push({ kind: 'count', row: -1 });
  t.rows.forEach((row, r) => {
    if (r > 0) slots.push({ kind: 'phase', row: r });
    if (askable(p, row)) slots.push({ kind: 'value', row: r });
  });
  return slots;
}

// ---------------------------------------------------------------------------
// Expected answers

export type ValueKind = 'number' | 'bool' | 'text';

export function valueKind(p: Problem, row: Row): ValueKind {
  switch (row.phase) {
    case 'init':
    case 'update':
      return 'number';
    case 'check':
      return 'bool';
    case 'body':
      return p.body.kind === 'print' ? 'text' : 'number';
    case 'exit':
      return 'text';
  }
}

/** The column a value slot fills in the trace table. */
export function valueColumn(p: Problem, row: Row): string {
  switch (row.phase) {
    case 'init':
    case 'update':
      return p.v;
    case 'check':
      return 'cond';
    case 'body':
      return p.body.kind === 'print' ? 'out' : p.body.target;
    case 'exit':
      return 'out';
  }
}

export const normText = (x: string) => x.trim().replace(/\s+/g, ' ');

export function expectedValue(p: Problem, row: Row): Answer {
  switch (row.phase) {
    case 'init':
    case 'update':
      return { kind: 'number', value: row.i as number };
    case 'check':
      return { kind: 'bool', value: row.cond as boolean };
    case 'body':
      if (p.body.kind === 'print') return { kind: 'text', value: normText(row.out) };
      return { kind: 'number', value: row.vars[p.body.target] };
    case 'exit':
      return { kind: 'text', value: normText(row.out) };
  }
}

export function formatAnswer(a: Answer): string {
  switch (a.kind) {
    case 'number':
      return String(a.value);
    case 'bool':
      return String(a.value);
    case 'phase':
      return PHASE_NAME[a.value];
    case 'text':
      return a.value;
  }
}

function same(a: Answer, b: Answer): boolean {
  if (a.kind === 'text' || b.kind === 'text') return normText(formatAnswer(a)) === normText(formatAnswer(b));
  return a.kind === b.kind && a.value === b.value;
}

// ---------------------------------------------------------------------------
// Context for messages

function stepPhrase(p: Problem): string {
  const u = p.update;
  switch (u.kind) {
    case 'inc':
      return 'goes up by 1 each time';
    case 'dec':
      return 'goes down by 1 each time';
    case 'add':
      return `goes up by ${u.by} each time`;
    case 'sub':
      return `goes down by ${u.by} each time`;
    case 'mul':
      return `is multiplied by ${u.by} each time`;
  }
}

function bodyWork(p: Problem, i: number, before: Record<string, number>): string {
  const b = p.body;
  switch (b.kind) {
    case 'acc': {
      const x = b.operand === 'var' ? i : b.operand;
      const after = applyBody(p, i, before).vars[b.target];
      return `\`${b.target}\` = ${before[b.target]} ${b.op} ${x} = ${after}`;
    }
    case 'inc':
      return `\`${b.target}\` goes from ${before[b.target]} to ${before[b.target] + 1}`;
    case 'print':
      return `this pass prints ${i}`;
  }
}

function baseCtx(p: Problem, t: Trace): Ctx {
  const other = flipStrictness(p.op);
  return {
    v: p.v,
    init: initCode(p),
    cond: condCode(p),
    condOther: other ? condCode(p, other) : '',
    op: p.op,
    bound: p.bound,
    upd: updCode(p),
    body: bodyCode(p),
    start: p.start,
    values: t.bodyValues.join(', '),
    passes: t.passes,
    stepPhrase: stepPhrase(p),
    up: countsUp(p),
    first: false,
    i: null,
    iBefore: null,
    iAfter: null,
    condInst: '',
    result: null,
    acc: p.body.kind === 'print' ? null : p.body.target,
    accBefore: null,
    accAfter: null,
    work: '',
    workAlt: '',
    line: null,
    outName: p.after[0]?.name ?? null,
    out: '',
    given: '',
  };
}

const inst = (p: Problem, i: number) => `${i} ${p.op} ${p.bound}`;

export function rowCtx(p: Problem, t: Trace, r: number): Ctx {
  const row = t.rows[r];
  const c = baseCtx(p, t);
  c.first = row.firstCheck;
  c.i = row.i;
  c.iBefore = row.iBefore;
  c.iAfter = row.phase === 'update' ? row.i : null;
  c.result = row.cond;
  c.line = row.line;
  c.out = normText(row.out);
  if (c.acc) {
    c.accBefore = row.varsBefore[c.acc];
    c.accAfter = row.vars[c.acc];
  }
  if (row.phase === 'check') c.condInst = inst(p, row.i as number);
  if (row.phase === 'update') c.condInst = inst(p, row.i as number); // the check that comes next
  if (row.phase === 'body') {
    const i = row.i as number;
    c.work = bodyWork(p, i, row.varsBefore);
    c.workAlt = bodyWork(p, applyUpdate(i, p.update), row.varsBefore);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Diagnosis

const DEFAULT_PRIORITY: MisconceptionId[] = ['M5', 'M2', 'M4', 'M3', 'M1'];

function pick(p: Problem, matches: { id: MisconceptionId; variant: string }[]) {
  if (!matches.length) return null;
  for (const id of p.targets) {
    const m = matches.find((x) => x.id === id);
    if (m) return m;
  }
  for (const id of DEFAULT_PRIORITY) {
    const m = matches.find((x) => x.id === id);
    if (m) return m;
  }
  return matches[0];
}

function verdict(
  correct: boolean,
  expected: Answer,
  given: Answer,
  variant: string,
  misconception: MisconceptionId | null,
  c: Ctx,
  explainsEnd = false,
): Verdict {
  c.given = formatAnswer(given);
  const build = MESSAGES[variant];
  return {
    correct,
    expected: formatAnswer(expected),
    given: formatAnswer(given),
    misconception,
    variant,
    message: build ? build(c) : '',
    explainsEnd: explainsEnd || undefined,
  };
}

/** Number of passes a learner holding each misconception would predict. */
export function buggyCounts(p: Problem, t: Trace): { id: MisconceptionId; variant: string; value: number }[] {
  const out: { id: MisconceptionId; variant: string; value: number }[] = [];
  const correct = t.passes;
  // M5: any positive count for a loop that never runs
  // (handled in diagnoseCount because it is a range, not a value)
  // M2: count with the strictness of the check flipped
  const other = flipStrictness(p.op);
  if (other) {
    const n = safePasses(p, { op: other });
    if (n !== null && n !== correct) out.push({ id: 'M2', variant: 'M2.count', value: n });
  }
  // M1: count read off the bound (or the start, for a loop that counts down)
  const up = countsUp(p);
  const boundOnly = up ? Math.abs(p.bound) : Math.abs(p.start);
  if (boundOnly !== correct && correct > 0) out.push({ id: 'M1', variant: 'M1.count', value: boundOnly });
  // M1: count that ignores the step size (as if it were ++ or --)
  const unit = p.update.kind === 'inc' || p.update.kind === 'dec' || (p.update.kind !== 'mul' && p.update.by === 1);
  if (!unit && correct > 0) {
    const n = safePasses(p, { update: up ? { kind: 'inc' } : { kind: 'dec' } });
    if (n !== null && n !== correct) out.push({ id: 'M1', variant: 'M1.count', value: n });
  }
  return out;
}

function safePasses(p: Problem, o: Parameters<typeof simulate>[1]): number | null {
  try {
    return simulate(p, o).passes;
  } catch {
    return null;
  }
}

export function diagnoseCount(p: Problem, t: Trace, n: number): Verdict {
  const expected: Answer = { kind: 'number', value: t.passes };
  const given: Answer = { kind: 'number', value: n };
  const c = baseCtx(p, t);
  c.condInst = inst(p, p.start);
  if (n === t.passes) return verdict(true, expected, given, 'right.count', null, c);
  const matches: { id: MisconceptionId; variant: string }[] = [];
  if (t.passes === 0 && n > 0) matches.push({ id: 'M5', variant: 'M5.count' });
  for (const b of buggyCounts(p, t)) if (b.value === n) matches.push(b);
  const m = pick(p, matches);
  return verdict(false, expected, given, m ? m.variant : 'generic.count', m ? m.id : null, c);
}

export function diagnosePhase(p: Problem, t: Trace, r: number, answer: Phase): Verdict {
  const row = t.rows[r];
  const prev = t.rows[r - 1];
  const expected: Answer = { kind: 'phase', value: row.phase };
  const given: Answer = { kind: 'phase', value: answer };
  const c = rowCtx(p, t, r);
  if (answer === row.phase) return verdict(true, expected, given, 'right.phase', null, c);
  let variant = '';
  let mc: MisconceptionId | null = null;
  switch (prev.phase) {
    case 'init':
      if (answer === 'body') [variant, mc] = ['M3.checkFirst', 'M3'];
      else if (answer === 'update') [variant, mc] = ['M3.updateLater', 'M3'];
      else variant = 'generic.phase.afterInit';
      break;
    case 'check':
      if (prev.cond) {
        if (answer === 'update') [variant, mc] = ['M3.bodyBeforeUpdate', 'M3'];
        else variant = 'generic.phase.afterTrue';
      } else if (answer === 'body' && prev.firstCheck) [variant, mc] = ['M5.zeroPasses', 'M5'];
      else variant = 'generic.phase.afterFalse';
      break;
    case 'body':
      if (answer === 'check') [variant, mc] = ['M3.updateBeforeCheck', 'M3'];
      else if (answer === 'exit' && prev.lastBody) [variant, mc] = ['M4.updateOnLastPass', 'M4'];
      else variant = 'generic.phase.afterBody';
      break;
    case 'update':
      if (answer === 'body') [variant, mc] = ['M3.checkEveryPass', 'M3'];
      else variant = 'generic.phase.afterUpdate';
      break;
    case 'exit':
      variant = 'generic.phase.afterFalse';
      break;
  }
  return verdict(false, expected, given, variant, mc, c);
}

export function diagnoseValue(p: Problem, t: Trace, r: number, answer: Answer): Verdict {
  const row = t.rows[r];
  const expected = expectedValue(p, row);
  const c = rowCtx(p, t, r);
  const right = same(answer, expected);
  const matches: { id: MisconceptionId; variant: string }[] = [];

  switch (row.phase) {
    case 'init': {
      if (right) return verdict(true, expected, answer, 'right.value', null, c);
      if (answer.kind === 'number' && answer.value === applyUpdate(p.start, p.update)) matches.push({ id: 'M3', variant: 'M3.updateFirst' });
      const m = pick(p, matches);
      return verdict(false, expected, answer, m ? m.variant : 'generic.init', m ? m.id : null, c);
    }
    case 'check': {
      const i = row.i as number;
      if (right) {
        if (row.firstCheck && !row.cond) return verdict(true, expected, answer, 'right.firstCheckFalse', null, c);
        if (row.finalCheck) return verdict(true, expected, answer, 'right.finalCheck', null, c);
        if (i === p.bound && (p.op === '<=' || p.op === '>=')) return verdict(true, expected, answer, 'right.boundIncluded', null, c);
        return verdict(true, expected, answer, 'right.value', null, c);
      }
      const other = flipStrictness(p.op);
      if (other && answer.kind === 'bool' && compare(i, other, p.bound) === answer.value) {
        matches.push(p.op === '<' || p.op === '>' ? { id: 'M2', variant: 'M2.strictAsInclusive' } : { id: 'M2', variant: 'M2.inclusiveAsStrict' });
      }
      if (row.firstCheck && row.cond === false && answer.kind === 'bool' && answer.value) matches.push({ id: 'M5', variant: 'M5.firstCheckFalse' });
      const m = pick(p, matches);
      const ends = m?.variant === 'M5.firstCheckFalse';
      return verdict(false, expected, answer, m ? m.variant : 'generic.check', m ? m.id : null, c, ends);
    }
    case 'body': {
      if (right) return verdict(true, expected, answer, 'right.value', null, c);
      const i = row.i as number;
      const iNext = applyUpdate(i, p.update);
      const alt = applyBody(p, iNext, row.varsBefore);
      const altAnswer: Answer = p.body.kind === 'print' ? { kind: 'text', value: normText(alt.out) } : { kind: 'number', value: alt.vars[p.body.target] };
      if (!same(altAnswer, expected) && same(answer, altAnswer)) matches.push({ id: 'M3', variant: 'M3.bodyUsesUpdatedI' });
      const m = pick(p, matches);
      if (m) return verdict(false, expected, answer, m.variant, m.id, c);
      if (p.body.kind === 'print') return verdict(false, expected, answer, 'generic.print', null, c);
      const unchanged = answer.kind === 'number' && answer.value === row.varsBefore[p.body.target];
      return verdict(false, expected, answer, unchanged ? 'generic.body.unchanged' : 'generic.body', null, c);
    }
    case 'update': {
      if (right) return verdict(true, expected, answer, row.finalUpdate ? 'right.finalUpdate' : 'right.value', null, c);
      const before = row.iBefore as number;
      if (row.finalUpdate && answer.kind === 'number') {
        if (answer.value === before) matches.push({ id: 'M4', variant: 'M4.unchanged' });
        else if (answer.value === p.bound || answer.value === lastPassing(p)) matches.push({ id: 'M4', variant: 'M4.stopsAtBound' });
      }
      const m = pick(p, matches);
      if (m) return verdict(false, expected, answer, m.variant, m.id, c, true);
      const unchanged = answer.kind === 'number' && answer.value === before;
      return verdict(false, expected, answer, unchanged ? 'generic.update.unchanged' : 'generic.update', null, c);
    }
    case 'exit': {
      if (right) return verdict(true, expected, answer, 'right.value', null, c);
      // buggy whole loop runs: the output a learner would expect under M2 or M5
      const other = flipStrictness(p.op);
      if (other) {
        try {
          const alt = simulate(p, { op: other });
          if (alt.afterOutput !== t.afterOutput && same(answer, { kind: 'text', value: normText(alt.afterOutput) })) matches.push({ id: 'M2', variant: 'M2.output' });
        } catch {
          /* flipped loop does not terminate; no M2 candidate */
        }
      }
      if (t.passes === 0) {
        const once = applyBody(p, p.start, row.varsBefore);
        const outOnce = p.after.map((a) => once.vars[a.name]).join(' ');
        if (same(answer, { kind: 'text', value: outOnce })) matches.push({ id: 'M5', variant: 'M5.output' });
      }
      const m = pick(p, matches);
      return verdict(false, expected, answer, m ? m.variant : 'generic.output', m ? m.id : null, c);
    }
  }
}

/** The last value of the loop variable that would still pass the check, for a step of 1. */
function lastPassing(p: Problem): number | null {
  switch (p.op) {
    case '<':
      return p.bound - 1;
    case '<=':
      return p.bound;
    case '>':
      return p.bound + 1;
    case '>=':
      return p.bound;
    case '!=':
      return null;
  }
}

export function diagnose(p: Problem, t: Trace, slot: Slot, answer: Answer): Verdict {
  switch (slot.kind) {
    case 'count':
      if (answer.kind !== 'number') throw new Error('count answers are numbers');
      return diagnoseCount(p, t, answer.value);
    case 'phase':
      if (answer.kind !== 'phase') throw new Error('phase answers are phases');
      return diagnosePhase(p, t, slot.row, answer.value);
    case 'value':
      return diagnoseValue(p, t, slot.row, answer);
  }
}
