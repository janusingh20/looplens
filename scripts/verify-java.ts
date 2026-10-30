// Checks every LoopLens trace against real Java.
//
// For each problem in the bank this script
//   1. asks the simulator for the expected transcript,
//   2. generates a Java program that runs the exact same loop with logging probes,
//   3. runs it on the installed JDK (OpenJDK 21 in CI) with the single file launcher,
//   4. compares the two transcripts character for character.
//
// It writes public/verification.json (shown on the problem bank page of the
// deployed site), adds a table to the GitHub Actions job summary, and exits
// with code 1 if any trace differs, which stops the deploy.

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PROBLEMS } from '../src/content/problems';
import { instrumentedJava } from '../src/sim/java';
import { simulate, transcript } from '../src/sim/simulate';

const root = resolve(import.meta.dirname, '..');
const workDir = join(root, 'java-check');
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

const ver = spawnSync('java', ['-version'], { encoding: 'utf8' });
if (ver.error) {
  console.error('Could not run `java`. Install a JDK (17 or newer) and try again.');
  process.exit(2);
}
const versionLines = `${ver.stderr}\n${ver.stdout}`
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('Picked up'));
const jdk = versionLines[0] ?? 'unknown';
const runtime = versionLines[1] ?? '';

interface Result {
  id: string;
  title: string;
  role: string;
  steps: number;
  match: boolean;
  java: string;
  diff?: string;
}

const results: Result[] = [];
for (const p of PROBLEMS) {
  const expected = transcript(p, simulate(p));
  const java = instrumentedJava(p, p.id);
  const file = join(workDir, `${p.id}.java`);
  writeFileSync(file, java);
  const run = spawnSync('java', [file], { encoding: 'utf8', timeout: 120_000 });
  const actual = (run.stdout ?? '').replace(/\r\n/g, '\n').trimEnd();
  const match = run.status === 0 && actual === expected;
  const r: Result = { id: p.id, title: p.title, role: p.role, steps: expected.split('\n').length, match, java };
  if (!match) {
    r.diff = diff(expected, actual) + (run.stderr ? `\n--- stderr ---\n${run.stderr}` : '');
    console.error(`\n${p.id} MISMATCH\n${r.diff}`);
  } else {
    console.log(`${p.id}  ${String(r.steps).padStart(2)} steps  match`);
  }
  results.push(r);
}

const allMatch = results.every((r) => r.match);
const server = process.env.GITHUB_SERVER_URL;
const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const report = {
  jdk,
  runtime,
  checkedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : null,
  runUrl: server && repo && runId ? `${server}/${repo}/actions/runs/${runId}` : null,
  allMatch,
  matched: results.filter((r) => r.match).length,
  total: results.length,
  problems: results.map(({ diff: _d, ...rest }) => rest),
};
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'verification.json'), JSON.stringify(report, null, 2) + '\n');

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) {
  const lines = [
    `## LoopLens traces vs OpenJDK`,
    ``,
    `${report.matched} of ${report.total} traces match. JDK: \`${jdk}\`${runtime ? ` (${runtime})` : ''}.`,
    ``,
    `| Problem | Role | Steps | Result |`,
    `| --- | --- | ---: | --- |`,
    ...results.map((r) => `| ${r.id} ${r.title} | ${r.role} | ${r.steps} | ${r.match ? 'match' : '**MISMATCH**'} |`),
    ``,
  ];
  appendFileSync(summaryFile, lines.join('\n'));
}

console.log(`\n${report.matched} of ${report.total} traces match ${jdk}`);
if (!allMatch) process.exit(1);

function diff(a: string, b: string): string {
  const x = a.split('\n');
  const y = b.split('\n');
  const out: string[] = [];
  for (let k = 0; k < Math.max(x.length, y.length); k++) {
    if (x[k] === y[k]) out.push(`  ${x[k]}`);
    else {
      if (x[k] !== undefined) out.push(`- ${x[k]}   (simulator)`);
      if (y[k] !== undefined) out.push(`+ ${y[k]}   (java)`);
    }
  }
  return out.join('\n');
}
