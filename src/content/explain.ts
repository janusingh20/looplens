import { rowCtx } from '../sim/diagnose';
import type { Problem, Trace } from '../sim/types';

// Step explanations for worked examples. Each one names the phase (the
// subgoal label) and shows the actual values, so the learner sees the
// substitution, not just the result.

export function explainStep(p: Problem, t: Trace, r: number): string {
  const row = t.rows[r];
  const c = rowCtx(p, t, r);
  switch (row.phase) {
    case 'init':
      return `Initialize runs once, before anything else: \`${c.init}\` sets \`${c.v}\` to ${c.start}.`;
    case 'check':
      if (row.cond) {
        return row.firstCheck
          ? `Check runs before the first pass. Is \`${c.cond}\`? \`${c.condInst}\` is true, so the body runs.`
          : `Check again with the new value. \`${c.condInst}\` is true, so the body runs again.`;
      }
      return row.firstCheck
        ? `Check runs before the first pass. \`${c.condInst}\` is false, so the body never runs.`
        : `Check again. \`${c.condInst}\` is false, so the loop ends. The body never runs with \`${c.v}\` = ${row.i}.`;
    case 'body':
      return p.body.kind === 'print'
        ? `Body: \`${c.body}\` prints the current \`${c.v}\`, which is ${row.i}.`
        : `Body: \`${c.body}\` uses the current \`${c.v}\`, so ${c.work}.`;
    case 'update':
      return row.finalUpdate
        ? `Update runs even after the last pass: \`${c.upd}\` takes \`${c.v}\` from ${row.iBefore} to ${row.i}. The check comes next.`
        : `Update runs after the body: \`${c.upd}\` takes \`${c.v}\` from ${row.iBefore} to ${row.i}. The check comes next.`;
    case 'exit':
      if (p.after.length) return `After the loop, line ${row.line} prints \`${p.after[0].name}\`, which is ${row.vars[p.after[0].name]}.`;
      return `The loop is over. The program printed ${t.output.trim() ? `\`${t.output.trim()}\`` : 'nothing'}.`;
  }
}

/** One sentence summary of a trace, for the problem bank. */
export function traceSummary(p: Problem, t: Trace): string {
  const seen = t.passes === 0 ? 'The body never runs' : `The body runs ${t.passes === 1 ? 'once' : `${t.passes} times`} with ${p.v} = ${t.bodyValues.join(', ')}`;
  const out = t.output.trim() ? `prints ${t.output.trim()}` : 'prints nothing';
  return `${seen}; ${p.v} ends at ${t.finalI}; ${out}.`;
}
