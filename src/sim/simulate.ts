import { layout } from './codegen';
import type { CmpOp, LoopUpdate, Problem, Row, Trace } from './types';

const MAX_PASSES = 1000;

// Java int arithmetic: wrap to 32 bits like the JVM does.
const add = (a: number, b: number) => (a + b) | 0;
const mul = (a: number, b: number) => Math.imul(a, b);

export function compare(a: number, op: CmpOp, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '!=':
      return a !== b;
  }
}

/** The operator a learner holding M2 confuses with this one. */
export function flipStrictness(op: CmpOp): CmpOp | null {
  switch (op) {
    case '<':
      return '<=';
    case '<=':
      return '<';
    case '>':
      return '>=';
    case '>=':
      return '>';
    case '!=':
      return null;
  }
}

export function applyUpdate(i: number, u: LoopUpdate): number {
  switch (u.kind) {
    case 'inc':
      return add(i, 1);
    case 'dec':
      return add(i, -1);
    case 'add':
      return add(i, u.by);
    case 'sub':
      return add(i, -u.by);
    case 'mul':
      return mul(i, u.by);
  }
}

/** Does the loop variable move up (true) or down (false)? */
export function countsUp(p: Pick<Problem, 'update' | 'start'>): boolean {
  const u = p.update;
  if (u.kind === 'inc' || u.kind === 'add') return true;
  if (u.kind === 'dec' || u.kind === 'sub') return false;
  // multiplication grows a positive start
  return p.start >= 0;
}

export function applyBody(p: Problem, i: number, vars: Record<string, number>): { vars: Record<string, number>; out: string } {
  const b = p.body;
  const next = { ...vars };
  switch (b.kind) {
    case 'acc': {
      const x = b.operand === 'var' ? i : b.operand;
      next[b.target] = b.op === '+' ? add(vars[b.target], x) : mul(vars[b.target], x);
      return { vars: next, out: '' };
    }
    case 'inc':
      next[b.target] = add(vars[b.target], 1);
      return { vars: next, out: '' };
    case 'print':
      return { vars: next, out: b.newline ? `${i}\n` : `${i} ` };
  }
}

export type LoopOverride = Partial<Pick<Problem, 'start' | 'op' | 'bound' | 'update'>>;

/** Run the problem's loop exactly as Java would and record every step. */
export function simulate(problem: Problem, override: LoopOverride = {}): Trace {
  const p: Problem = { ...problem, ...override };
  const L = layout(p);
  const rows: Row[] = [];
  let vars: Record<string, number> = {};
  for (const d of p.decls) vars[d.name] = d.init;

  const push = (r: Omit<Row, 'step' | 'firstCheck' | 'finalCheck' | 'finalUpdate' | 'lastBody'>) => {
    rows.push({ ...r, step: rows.length + 1, firstCheck: false, finalCheck: false, finalUpdate: false, lastBody: false });
  };

  let i = p.start;
  push({ phase: 'init', line: L.header, segment: 'init', pass: 0, i, iBefore: null, cond: null, vars: { ...vars }, varsBefore: { ...vars }, out: '' });

  let passes = 0;
  const bodyValues: number[] = [];
  let bodyOutput = '';
  for (;;) {
    const c = compare(i, p.op, p.bound);
    push({ phase: 'check', line: L.header, segment: 'cond', pass: passes + 1, i, iBefore: i, cond: c, vars: { ...vars }, varsBefore: { ...vars }, out: '' });
    if (!c) break;
    passes++;
    if (passes > MAX_PASSES) throw new Error(`${p.id}: loop does not terminate within ${MAX_PASSES} passes`);
    const before = { ...vars };
    const r = applyBody(p, i, vars);
    vars = r.vars;
    bodyValues.push(i);
    bodyOutput += r.out;
    push({ phase: 'body', line: L.body, segment: 'body', pass: passes, i, iBefore: i, cond: null, vars: { ...vars }, varsBefore: before, out: r.out });
    const iBefore = i;
    i = applyUpdate(i, p.update);
    push({ phase: 'update', line: L.header, segment: 'update', pass: passes, i, iBefore, cond: null, vars: { ...vars }, varsBefore: { ...vars }, out: '' });
  }

  let afterOutput = '';
  for (const a of p.after) afterOutput += `${vars[a.name]}\n`;
  push({
    phase: 'exit',
    line: p.after.length ? L.afterLines[0] : L.close,
    segment: p.after.length ? 'after' : 'close',
    pass: passes + 1,
    i: null,
    iBefore: i,
    cond: null,
    vars: { ...vars },
    varsBefore: { ...vars },
    out: afterOutput,
  });

  // mark the boundary steps the feedback cares about
  const checks = rows.filter((r) => r.phase === 'check');
  checks[0].firstCheck = true;
  checks[checks.length - 1].finalCheck = true;
  const updates = rows.filter((r) => r.phase === 'update');
  if (updates.length) updates[updates.length - 1].finalUpdate = true;
  const bodies = rows.filter((r) => r.phase === 'body');
  if (bodies.length) bodies[bodies.length - 1].lastBody = true;

  return {
    rows,
    passes,
    bodyValues,
    finalI: i,
    finalVars: { ...vars },
    output: bodyOutput + afterOutput,
    bodyOutput,
    afterOutput,
  };
}

// ---------------------------------------------------------------------------
// Transcript: the exact text the instrumented Java program prints on OpenJDK.
// CI compares the two strings character for character.

export function q(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
}

export function transcript(p: Problem, t: Trace = simulate(p)): string {
  const st = (vars: Record<string, number>) => p.decls.map((d) => ` | ${d.name}=${vars[d.name]}`).join('');
  return t.rows
    .map((r) => {
      switch (r.phase) {
        case 'init':
          return `INIT ${p.v}=${r.i}${st(r.vars)} | out=${q(r.out)}`;
        case 'check':
          return `CHECK ${p.v}=${r.i} ${r.cond}${st(r.vars)} | out=${q(r.out)}`;
        case 'body':
          return `BODY ${p.v}=${r.i}${st(r.vars)} | out=${q(r.out)}`;
        case 'update':
          return `UPDATE ${p.v}=${r.i}${st(r.vars)} | out=${q(r.out)}`;
        case 'exit':
          return `AFTER${st(r.vars)} | out=${q(r.out)}`;
      }
    })
    .join('\n');
}
