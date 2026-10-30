import type { MisconceptionId } from '../sim/types';

// Every message LoopLens can show, in one place so they can be reviewed
// (the problem bank page lists them). `backticks` mark code.

export interface MisconceptionInfo {
  id: MisconceptionId;
  name: string;
  /** what the learner believes, in the proposal's words */
  belief: string;
  /** the one line rule shown under the feedback and in the end summary */
  rule: string;
}

export const MISCONCEPTIONS: Record<MisconceptionId, MisconceptionInfo> = {
  M1: {
    id: 'M1',
    name: 'Counting passes from the bound',
    belief: 'Counts iterations from the upper bound, ignoring the start value and the step size.',
    rule: 'To count passes, list the values the body sees. The bound only says when to stop.',
  },
  M2: {
    id: 'M2',
    name: '< versus <=',
    belief: 'Treats < and <= (or > and >=) as if they were the same check.',
    rule: '`<` stops before the bound. `<=` lets the bound itself through.',
  },
  M3: {
    id: 'M3',
    name: 'Order of the phases',
    belief: 'Runs the loop phases in the wrong order, for example the update before the body or the body before the first check.',
    rule: 'Initialize once, then check, body, update, and repeat. The check always comes before the body.',
  },
  M4: {
    id: 'M4',
    name: 'Where the loop variable ends',
    belief: 'Expects the loop variable to end at the last value it held inside the body.',
    rule: 'The update runs after every pass, so the loop variable ends one step past the last value the body used.',
  },
  M5: {
    id: 'M5',
    name: 'Loops that run zero times',
    belief: 'Assumes the body always runs at least once.',
    rule: 'The check comes first. If it is false right away, the body runs zero times.',
  },
};

export const MISCONCEPTION_ORDER: MisconceptionId[] = ['M1', 'M2', 'M3', 'M4', 'M5'];

/** Values a message can refer to. Built by diagnose.ts for the step at hand. */
export interface Ctx {
  v: string;
  init: string; // int i = 2
  cond: string; // i < 10
  condOther: string; // i <= 10 (M2 flip), or '' when there is none
  op: string;
  bound: number;
  upd: string; // i += 3
  body: string; // sum = sum + i;
  start: number;
  values: string; // 2, 5, 8
  passes: number;
  stepPhrase: string; // goes up by 3 each time
  /** the loop variable counts up (false for a countdown) */
  up: boolean;
  // the current step
  /** this step is the first check, so the body has not run yet */
  first: boolean;
  i: number | null;
  iBefore: number | null;
  iAfter: number | null;
  condInst: string; // 11 < 10 (this check) or the next check after a final update
  result: boolean | null;
  acc: string | null; // sum
  accBefore: number | null;
  accAfter: number | null;
  work: string; // `sum` = 0 + 2 = 2   |   `count` goes from 1 to 2   |   this pass prints 10
  workAlt: string; // the same work with the updated i (M3)
  line: number | null;
  outName: string | null;
  out: string;
  given: string;
}

const s = (n: number) => (n === 1 ? '' : 'es');
const times = (n: number) => (n === 1 ? '1 time' : `${n} times`);
const accTail = (c: Ctx) => (c.acc ? ` and \`${c.acc}\` stays ${c.accAfter}` : '');
const seen = (c: Ctx) => (c.passes === 0 ? 'the body never ran' : `the body saw \`${c.v}\` = ${c.values}`);

export const MESSAGES: Record<string, (c: Ctx) => string> = {
  // count prediction (independent problems, revealed after the trace)
  'M1.count': (c) =>
    (c.up
      ? `Not quite. The bound, ${c.bound}, tells the loop when to stop, not how many passes to make. `
      : `Not quite. The start, ${c.start}, is where the countdown begins, not how many passes it makes. `) +
    `${cap(seen(c))}: that's ${c.passes} pass${s(c.passes)}, because \`${c.v}\` starts at ${c.start} and ${c.stepPhrase}.`,
  'M2.count': (c) =>
    `Not quite. The body ran ${times(c.passes)}, with \`${c.v}\` = ${c.values}. You counted as if the check were \`${c.condOther}\`. ` +
    (c.op === '<' || c.op === '>'
      ? `With \`${c.op}\`, \`${c.bound} ${c.op} ${c.bound}\` is false, so the body never runs with \`${c.v}\` = ${c.bound}.`
      : `With \`${c.op}\`, the bound itself passes, so \`${c.v}\` = ${c.bound} gets a turn.`),
  'M5.count': (c) =>
    `Not quite. The body runs 0 times here. Java checks \`${c.condInst}\` before the first pass, and it's already false, so it skips straight past the loop.`,
  'generic.count': (c) =>
    c.passes === 0
      ? `Not quite. The body ran 0 times: the very first check was already false.`
      : `Not quite. The body ran ${times(c.passes)}, with \`${c.v}\` = ${c.values}.`,
  'right.count': (c) =>
    c.passes === 0
      ? `Your prediction held up: the body never ran.`
      : `Your prediction held up: the body ran ${times(c.passes)}, with \`${c.v}\` = ${c.values}.`,

  // which phase comes next (independent problems)
  'M3.checkFirst': (c) =>
    `Not quite. The check runs before the body, even on the very first pass. Right after \`${c.init}\`, Java asks whether \`${c.cond}\` and runs the body only if the answer is true.`,
  'M3.updateLater': (c) =>
    `Not quite. The update waits until a pass of the body has finished. Right after \`${c.init}\`, Java runs the check \`${c.cond}\`.`,
  'M3.bodyBeforeUpdate': (c) =>
    `Not quite. When the check is true, the body runs next. The update \`${c.upd}\` waits until the body is done.`,
  'M3.updateBeforeCheck': (c) =>
    `Not quite. After the body, the update \`${c.upd}\` runs before the next check. That's why each check sees a new value of \`${c.v}\`.`,
  'M3.checkEveryPass': (c) =>
    `Not quite. After the update, Java checks \`${c.cond}\` again before the body gets another pass. The check runs before every pass, not only the first one.`,
  'M4.updateOnLastPass': (c) =>
    `Not quite. Even after the last pass, the update \`${c.upd}\` still runs, and then the check runs one more time. The loop only ends when a check comes out false.`,
  'M5.zeroPasses': () =>
    `Not quite. The very first check was false, so the body is skipped completely and the loop ends. A for loop can run zero times.`,
  'generic.phase.afterInit': (c) =>
    `Not quite. Right after \`${c.init}\`, Java runs the check \`${c.cond}\`. Initialization happens only once.`,
  'generic.phase.afterTrue': () =>
    `Not quite. The check was true, so the body runs next. A loop only ends when a check is false.`,
  'generic.phase.afterFalse': () =>
    `Not quite. The check was false, so the loop ends here and Java moves on to the code after it.`,
  'generic.phase.afterBody': (c) => `Not quite. After the body, the update \`${c.upd}\` runs.`,
  'generic.phase.afterUpdate': (c) =>
    `Not quite. After the update, Java runs the check \`${c.cond}\` again. Only a false check ends the loop.`,

  // initialize
  'M3.updateFirst': (c) =>
    `Not quite. \`${c.init}\` runs once, at the very start, so \`${c.v}\` begins at ${c.start}. The update \`${c.upd}\` only runs after a pass of the body.`,
  'generic.init': (c) => `Not quite. \`${c.init}\` sets \`${c.v}\` to ${c.start}.`,

  // check
  'M2.strictAsInclusive': (c) =>
    `Not quite. \`${c.condInst}\` is false. \`${c.op}\` means strictly ${c.op === '<' ? 'less' : 'greater'} than, so the check fails as soon as \`${c.v}\` reaches ${c.bound}. With \`${c.op}=\` it would be true and the body would run${c.first ? '' : ' once more'}.`,
  'M2.inclusiveAsStrict': (c) =>
    `Not quite. \`${c.condInst}\` is true. \`${c.op}\` means ${c.op === '<=' ? 'less' : 'greater'} than or equal to, so \`${c.v}\` = ${c.bound} still passes and the body runs${c.first ? '' : ' once more'}.`,
  'M5.firstCheckFalse': (c) =>
    `Not quite. \`${c.condInst}\` is false, and Java runs this check before the first pass. So the body never runs${c.acc ? `, and \`${c.acc}\` stays ${c.accAfter}` : ''}. A for loop can run zero times.`,
  'generic.check': (c) =>
    `Not quite. Right now \`${c.v}\` is ${c.i}, so the check is \`${c.condInst}\`, which is ${c.result}.`,

  // body
  'M3.bodyUsesUpdatedI': (c) =>
    `Not quite. The body uses the current value, \`${c.v}\` = ${c.i}. The update \`${c.upd}\` hasn't run yet; it comes after the body. So ${c.work}.`,
  'generic.body.unchanged': (c) => `Not quite. The body changes \`${c.acc}\` on every pass: ${c.work}.`,
  'generic.body': (c) => `Not quite. The body runs \`${c.body}\` with \`${c.v}\` = ${c.i}: ${c.work}.`,
  'generic.print': (c) => `Not quite. This pass prints the current value of \`${c.v}\`, which is ${c.i}.`,

  // update
  'M4.unchanged': (c) =>
    `Not quite. The update \`${c.upd}\` runs after every pass through the body, including the last one, so \`${c.v}\` becomes ${c.iAfter}. Only then is \`${c.condInst}\` checked; it is false, so the loop ends${accTail(c)}.`,
  'M4.stopsAtBound': (c) =>
    `Not quite. The update doesn't look at the bound. \`${c.upd}\` turns ${c.iBefore} into ${c.iAfter} no matter what. Only the next check notices: \`${c.condInst}\` is false, so the loop ends${accTail(c)}.`,
  'generic.update.unchanged': (c) =>
    `Not quite. The update \`${c.upd}\` changes \`${c.v}\` every time it runs: ${c.iBefore} becomes ${c.iAfter}.`,
  'generic.update': (c) => `Not quite. \`${c.upd}\` takes \`${c.v}\` from ${c.iBefore} to ${c.iAfter}.`,

  // after the loop
  'M2.output': (c) =>
    `Not quite. Line ${c.line} prints ${c.out}. Your answer matches a loop whose check is \`${c.condOther}\`, which would make one pass ${c.op === '<' || c.op === '>' ? 'more' : 'fewer'}.`,
  'M5.output': (c) =>
    `Not quite. The body never ran, so \`${c.outName}\` still holds its starting value and line ${c.line} prints ${c.out}.`,
  'generic.output': (c) => `Not quite. After the loop, line ${c.line} prints \`${c.outName}\`, which is ${c.out}.`,

  // Notes for correct answers at the boundaries. Each one confirms the rule
  // and stops there: what happens next is the learner's next prediction, so
  // a note never says it. The final check and a false first check get no note
  // (right.finalCheck, right.firstCheckFalse), because anything worth saying
  // there would give away the step that follows.
  'right.finalUpdate': (c) => `Right. The update runs after every pass, so \`${c.v}\` is now ${c.iAfter}.`,
  'right.boundIncluded': (c) => `Right. \`${c.op}\` lets the bound through: \`${c.condInst}\` is true.`,
};

function cap(x: string) {
  return x.charAt(0).toUpperCase() + x.slice(1);
}
