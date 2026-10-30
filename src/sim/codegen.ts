import type { BodyStmt, CmpOp, LoopUpdate, Problem, Segment } from './types';

export interface CodeSegment {
  text: string;
  role?: Segment;
}

export interface CodeLine {
  n: number;
  indent: number;
  segments: CodeSegment[];
}

export interface Layout {
  declLines: number[];
  header: number;
  body: number;
  close: number;
  afterLines: number[];
}

const INDENT = 4;

export function layout(p: Problem): Layout {
  const d = p.decls.length;
  const header = d + 1;
  return {
    declLines: p.decls.map((_, k) => k + 1),
    header,
    body: header + 1,
    close: header + 2,
    afterLines: p.after.map((_, k) => header + 3 + k),
  };
}

export const initCode = (p: Problem) => `int ${p.v} = ${p.start}`;

export const condCode = (p: Problem, op: CmpOp = p.op, bound: number = p.bound) => `${p.v} ${op} ${bound}`;

export function updateCode(v: string, u: LoopUpdate): string {
  switch (u.kind) {
    case 'inc':
      return `${v}++`;
    case 'dec':
      return `${v}--`;
    case 'add':
      return `${v} += ${u.by}`;
    case 'sub':
      return `${v} -= ${u.by}`;
    case 'mul':
      return `${v} *= ${u.by}`;
  }
}

export const updCode = (p: Problem) => updateCode(p.v, p.update);

export function bodyStmtCode(v: string, b: BodyStmt): string {
  switch (b.kind) {
    case 'acc': {
      const x = b.operand === 'var' ? v : String(b.operand);
      return b.style === 'compound' ? `${b.target} ${b.op}= ${x};` : `${b.target} = ${b.target} ${b.op} ${x};`;
    }
    case 'inc':
      return `${b.target}++;`;
    case 'print':
      return b.newline ? `System.out.println(${v});` : `System.out.print(${v} + " ");`;
  }
}

export const bodyCode = (p: Problem) => bodyStmtCode(p.v, p.body);

export const afterCode = (name: string) => `System.out.println(${name});`;

/** The learner facing code, as lines of segments so each loop phase can be highlighted. */
export function displayCode(p: Problem): CodeLine[] {
  const L = layout(p);
  const lines: CodeLine[] = [];
  p.decls.forEach((d, k) => {
    lines.push({ n: L.declLines[k], indent: 0, segments: [{ text: `int ${d.name} = ${d.init};`, role: 'decl' }] });
  });
  lines.push({
    n: L.header,
    indent: 0,
    segments: [
      { text: 'for (' },
      { text: initCode(p), role: 'init' },
      { text: '; ' },
      { text: condCode(p), role: 'cond' },
      { text: '; ' },
      { text: updCode(p), role: 'update' },
      { text: ') {' },
    ],
  });
  lines.push({ n: L.body, indent: INDENT, segments: [{ text: bodyCode(p), role: 'body' }] });
  lines.push({ n: L.close, indent: 0, segments: [{ text: '}', role: 'close' }] });
  p.after.forEach((a, k) => {
    lines.push({ n: L.afterLines[k], indent: 0, segments: [{ text: afterCode(a.name), role: 'after' }] });
  });
  return lines;
}

/** Plain text of the learner facing code. */
export function displayText(p: Problem): string {
  return displayCode(p)
    .map((l) => ' '.repeat(l.indent) + l.segments.map((s) => s.text).join(''))
    .join('\n');
}
