// Writes docs/problem_bank.md from the problem bank, so the bank can be read
// on GitHub without running the app. Run with `npm run bank:md`.

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { traceSummary } from '../src/content/explain';
import { MISCONCEPTION_ORDER, MISCONCEPTIONS } from '../src/content/feedback';
import { PROBLEMS, SLICE } from '../src/content/problems';
import { condCode, displayText } from '../src/sim/codegen';
import { diagnoseCount, diagnosePhase, diagnoseValue, PHASE_NAME } from '../src/sim/diagnose';
import { simulate } from '../src/sim/simulate';
import type { Problem } from '../src/sim/types';

const root = resolve(import.meta.dirname, '..');
const ROLE: Record<string, string> = {
  worked: 'Worked example',
  faded: 'Faded example',
  independent: 'On your own',
  header: 'Write the header (LO5)',
  checkpoint: 'Checkpoint',
};

const lines: string[] = [];
lines.push('# LoopLens problem bank');
lines.push('');
lines.push('Generated from `src/content/problems.ts` by `npm run bank:md`. Every trace below is produced by the simulator and checked against OpenJDK 21 in CI.');
lines.push('');
lines.push(`The Milestone 1 slice is ${SLICE.join(', ')}.`);
lines.push('');
lines.push('| Problem | Role | Objectives | Targets | Trace |');
lines.push('| --- | --- | --- | --- | --- |');
for (const p of PROBLEMS) {
  lines.push(`| ${p.id} ${p.title} | ${ROLE[p.role]} | ${p.objectives.join(', ')} | ${p.targets.join(', ')} | ${traceSummary(p, simulate(p))} |`);
}
lines.push('');

for (const p of PROBLEMS) {
  const t = simulate(p);
  lines.push(`## ${p.id} ${p.title}`);
  lines.push('');
  lines.push(`**${ROLE[p.role]}.** ${p.why}`);
  lines.push('');
  if (p.header) {
    lines.push(`Task: ${p.header.prompt} Reference answer: \`${condCode(p)}\`.`);
    lines.push('');
  }
  if (p.fadeFrom) {
    lines.push(`Steps 1 to ${p.fadeFrom - 1} are worked out; the learner predicts from step ${p.fadeFrom}.`);
    lines.push('');
  }
  lines.push('```java');
  lines.push(displayText(p));
  lines.push('```');
  lines.push('');
  const accs = p.decls.map((d) => d.name);
  lines.push(`| Step | Phase | ${p.v} | ${condCode(p).replace(/\|/g, '\\|')} | ${accs.join(' | ')}${accs.length ? ' | ' : ''}Output |`);
  lines.push(`| ---: | --- | ---: | --- | ${accs.map(() => '---:').join(' | ')}${accs.length ? ' | ' : ''}--- |`);
  for (const r of t.rows) {
    const out = r.out.trim();
    lines.push(
      `| ${r.step} | ${PHASE_NAME[r.phase]} | ${r.i ?? ''} | ${r.cond ?? ''} | ${accs.map((a) => r.vars[a]).join(' | ')}${accs.length ? ' | ' : ''}${out ? `\`${out}\`` : ''} |`,
    );
  }
  lines.push('');
}

lines.push('## Feedback messages, one example each');
lines.push('');
const P = (id: string) => PROBLEMS.find((p) => p.id === id) as Problem;
const t2 = simulate(P('P02'));
const t4 = simulate(P('P04'));
const t6 = simulate(P('P06'));
const t8 = simulate(P('P08'));
const ex = {
  M1: diagnoseCount(P('P04'), t4, 5),
  M2: diagnoseValue(P('P06'), t6, t6.rows.findIndex((r) => r.finalCheck), { kind: 'bool', value: true }),
  M3: diagnosePhase(P('P04'), t4, 1, 'body'),
  M4: diagnoseValue(P('P02'), t2, t2.rows.findIndex((r) => r.finalUpdate), { kind: 'number', value: 8 }),
  M5: diagnoseValue(P('P08'), t8, 1, { kind: 'bool', value: true }),
};
for (const id of MISCONCEPTION_ORDER) {
  const m = MISCONCEPTIONS[id];
  lines.push(`### ${id} ${m.name}`);
  lines.push('');
  lines.push(`Belief: ${m.belief}`);
  lines.push('');
  lines.push(`> ${ex[id].message}`);
  lines.push('');
  lines.push(`Rule: ${m.rule}`);
  lines.push('');
}

writeFileSync(join(root, 'docs', 'problem_bank.md'), lines.join('\n'));
console.log('wrote docs/problem_bank.md');
