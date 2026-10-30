// Core data model for LoopLens.
//
// A problem is written once as a small spec in a restricted grammar
// (one non nested `for` loop, an int counter, at most one accumulator,
// one body statement). From that single spec LoopLens generates:
//   1. the Java code the learner sees      (codegen.ts)
//   2. the step by step trace              (simulate.ts)
//   3. the instrumented Java program that  (java.ts)
//      CI runs on OpenJDK to check the trace
// so the code on screen and the trace can never disagree.

export type CmpOp = '<' | '<=' | '>' | '>=' | '!=';

export type LoopUpdate =
  | { kind: 'inc' } // i++
  | { kind: 'dec' } // i--
  | { kind: 'add'; by: number } // i += by
  | { kind: 'sub'; by: number } // i -= by
  | { kind: 'mul'; by: number }; // i *= by

export type BodyStmt =
  // sum = sum + i   |  sum += i   |  count = count + 1  |  product = product * i
  | { kind: 'acc'; target: string; op: '+' | '*'; operand: 'var' | number; style: 'long' | 'compound' }
  // count++
  | { kind: 'inc'; target: string }
  // System.out.println(i)  |  System.out.print(i + " ")
  | { kind: 'print'; newline: boolean };

// System.out.println(sum) after the loop
export interface AfterPrint {
  kind: 'println';
  name: string;
}

export type Role = 'worked' | 'faded' | 'independent' | 'header' | 'checkpoint';
export type Objective = 'LO1' | 'LO2' | 'LO3' | 'LO4' | 'LO5';
export type MisconceptionId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

export interface Problem {
  id: string;
  title: string;
  role: Role;
  /** loop variable name */
  v: string;
  /** accumulators declared before the loop */
  decls: { name: string; init: number }[];
  start: number;
  op: CmpOp;
  bound: number;
  update: LoopUpdate;
  body: BodyStmt;
  after: AfterPrint[];
  objectives: Objective[];
  /** misconceptions this problem is designed to expose, most important first */
  targets: MisconceptionId[];
  /** author note: why this problem is in the bank */
  why: string;
  /** faded examples: first step (1 based) the learner predicts; earlier steps are worked out */
  fadeFrom?: number;
  /** header problems (LO5): the learner writes the check so the body sees exactly these values.
   *  The problem's own op and bound are the reference solution. */
  header?: { prompt: string; values: number[] };
  /** worked examples: self explanation prompt and the expert answer shown afterwards */
  selfExplain?: { prompt: string; expert: string };
}

export type Phase = 'init' | 'check' | 'body' | 'update' | 'exit';
export type Segment = 'decl' | 'init' | 'cond' | 'update' | 'body' | 'close' | 'after';

export interface Row {
  /** 1 based step number */
  step: number;
  phase: Phase;
  /** 1 based display line of the code that runs in this step */
  line: number;
  segment: Segment;
  /** pass number: 0 for init; k for the check, body, and update of pass k;
   *  passes + 1 for the final (false) check and the exit */
  pass: number;
  /** loop variable after this step (null on exit: it is out of scope) */
  i: number | null;
  /** loop variable before this step */
  iBefore: number | null;
  /** result of the condition on check rows */
  cond: boolean | null;
  vars: Record<string, number>;
  varsBefore: Record<string, number>;
  /** text printed during this step */
  out: string;
  firstCheck: boolean;
  finalCheck: boolean;
  finalUpdate: boolean;
  lastBody: boolean;
}

export interface Trace {
  rows: Row[];
  passes: number;
  /** values of the loop variable the body actually saw */
  bodyValues: number[];
  /** loop variable at the final (false) check */
  finalI: number;
  finalVars: Record<string, number>;
  output: string;
  bodyOutput: string;
  afterOutput: string;
}

export type Mode = 'worked' | 'faded' | 'independent' | 'watch';

export type Answer =
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'phase'; value: Phase }
  | { kind: 'text'; value: string };

export type Slot =
  | { kind: 'count'; row: -1 }
  | { kind: 'phase'; row: number }
  | { kind: 'value'; row: number };

export interface Verdict {
  correct: boolean;
  /** correct answer, formatted for display */
  expected: string;
  /** learner's answer, formatted for display */
  given: string;
  misconception: MisconceptionId | null;
  /** which buggy rule or generic explanation produced the message, e.g. "M4.unchanged" */
  variant: string;
  /** feedback text; `backticks` mark code */
  message: string;
  /** when true, the message already explained how the loop ends, so the
   *  remaining in loop steps are shown instead of asked */
  explainsEnd?: boolean;
}
