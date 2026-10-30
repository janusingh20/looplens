import Prism from 'prismjs';
import 'prismjs/components/prism-java';
import { useMemo } from 'react';
import { displayCode, type CodeLine } from '../sim/codegen';
import type { Phase, Problem, Segment } from '../sim/types';
import { PhaseMark, PhaseShape } from './bits';

// Syntax highlighting is deliberately quiet (weight, not color): color in
// LoopLens means "which phase is running", nothing else.

function highlight(text: string): string {
  return Prism.highlight(text, Prism.languages.java, 'java');
}

const SEGMENT_PHASE: Partial<Record<Segment, Phase>> = { init: 'init', cond: 'check', body: 'body', update: 'update', after: 'exit', close: 'exit' };

export function CodePanel({
  problem,
  activeLine,
  activeSegment,
  activePhase,
  hide,
  status = false,
  label = 'Java code',
}: {
  problem: Problem;
  activeLine: number | null;
  activeSegment: Segment | null;
  activePhase: Phase | null;
  /** header problems hide the check until the learner writes it */
  hide?: Segment[];
  /** show which phase is running in a strip above the code */
  status?: boolean;
  /** accessible name of the code region; unique when several are on one page */
  label?: string;
}) {
  const lines = useMemo<CodeLine[]>(() => displayCode(problem), [problem]);
  return (
    <div className="code" role="region" aria-label={label}>
      {status && (
        <div className="code-status">
          {activePhase && activeLine ? (
            <>
              <span>Running now</span> <PhaseMark phase={activePhase} /> <span>on line {activeLine}</span>
            </>
          ) : (
            <span>Not running yet</span>
          )}
        </div>
      )}
      <pre className="code-pre">
        {lines.map((line) => {
          const active = line.n === activeLine;
          return (
            <div key={line.n} className={`code-line${active ? ' is-active' : ''}${active && activePhase ? ` ph-${activePhase}` : ''}`} aria-current={active ? 'step' : undefined}>
              <span className="code-gutter" aria-hidden="true">
                {active && activePhase && <PhaseShape phase={activePhase} size={10} />}
                {line.n}
              </span>
              <span className="code-text">
                {' '.repeat(line.indent)}
                {line.segments.map((seg, k) => {
                  const hot = active && seg.role !== undefined && seg.role === activeSegment;
                  const hidden = seg.role && hide?.includes(seg.role);
                  const phase = seg.role ? SEGMENT_PHASE[seg.role] : undefined;
                  if (hidden) {
                    return (
                      <span key={k} className="seg seg-blank">
                        {' '.repeat(Math.max(6, seg.text.length))}
                      </span>
                    );
                  }
                  return <span key={k} className={`seg${hot && phase ? ` seg-hot ph-${phase}` : ''}`} dangerouslySetInnerHTML={{ __html: highlight(seg.text) }} />;
                })}
              </span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export function Console({ text, placeholder = 'Nothing printed yet' }: { text: string; placeholder?: string }) {
  return (
    <div className="console" role="region" aria-label="Program output">
      <div className="console-head">Output</div>
      <pre className="console-body">{text ? text : <span className="console-empty">{placeholder}</span>}</pre>
    </div>
  );
}
