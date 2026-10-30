import { PhaseShape } from './bits';
import type { Phase } from '../sim/types';

// The anatomy of a for loop header, set as type: the hero of the start page
// and the opening of the orientation.

function Seg({ phase, code, name, when }: { phase: Phase; code: string; name: string; when: string }) {
  return (
    <span className={`anat-seg ph-${phase}`}>
      <code>{code}</code>
      <span className="anat-label" aria-hidden="true">
        <span className="anat-name">
          <PhaseShape phase={phase} size={11} />
          {name}
        </span>
        <span className="anat-when">{when}</span>
      </span>
    </span>
  );
}

export function Anatomy({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={`anatomy${compact ? ' is-compact' : ''}`}>
      <div
        className="anat-code"
        role="img"
        aria-label="for (int i = 2; i < 10; i += 3) { sum = sum + i; }. int i = 2 is the initialize phase and runs once, first. i < 10 is the check and runs before every pass. i += 3 is the update and runs after every pass. sum = sum + i is the body and runs only while the check is true."
      >
        <div className="anat-line has-labels">
          <span className="anat-plain">for (</span>
          <Seg phase="init" code="int i = 2" name="initialize" when="once, first" />
          <span className="anat-plain">; </span>
          <Seg phase="check" code="i < 10" name="check" when="before every pass" />
          <span className="anat-plain">; </span>
          <Seg phase="update" code="i += 3" name="update" when="after every pass" />
          <span className="anat-plain">{') {'}</span>
        </div>
        <div className="anat-line has-labels">
          <span className="anat-plain">{'    '}</span>
          <Seg phase="body" code="sum = sum + i;" name="body" when="only while the check is true" />
        </div>
        <div className="anat-line">
          <span className="anat-plain">{'}'}</span>
        </div>
      </div>
    </figure>
  );
}

// The cycle: initialize once, then check, body, update until a check is false.
export function PhaseCycle() {
  const node = (phase: Phase, x: number, y: number, name: string, when: string) => (
    <g className={`cyc-node ph-${phase}`} transform={`translate(${x} ${y})`}>
      <rect width="200" height="58" rx="8" />
      <g transform="translate(14 15)">
        <PhaseShape phase={phase} size={13} />
      </g>
      <text x="34" y="26" className="cyc-name">
        {name}
      </text>
      <text x="14" y="45" className="cyc-when">
        {when}
      </text>
    </g>
  );
  return (
    <figure className="cycle">
      <svg viewBox="0 0 970 250" role="img" aria-label="Initialize runs once and leads to check. When the check is true, the body runs, then the update, then the check again. When the check is false, the loop exits.">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10Z" className="cyc-arrowhead" />
          </marker>
        </defs>
        {node('init', 10, 30, 'initialize', 'once, first')}
        {node('check', 260, 30, 'check', 'before every pass')}
        {node('body', 510, 30, 'body', 'only if the check is true')}
        {node('update', 760, 30, 'update', 'after every pass')}
        {node('exit', 250, 178, 'exit', 'when the check is false')}
        <g className="cyc-edges" fill="none" markerEnd="url(#arrow)">
          <path d="M210 59H256" />
          <path d="M460 59H506" />
          <path d="M710 59H756" />
          <path d="M860 88V130H390V90" />
          <path d="M310 88V174" />
        </g>
        <text x="483" y="49" className="cyc-edge-label" textAnchor="middle">
          true
        </text>
        <text x="298" y="142" className="cyc-edge-label" textAnchor="end">
          false
        </text>
        <text x="625" y="121" className="cyc-edge-label" textAnchor="middle">
          repeat
        </text>
      </svg>
    </figure>
  );
}

export function LensMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="lensmark">
      <circle cx="10.5" cy="10.5" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M16.4 16.4 22 22" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13.9 8.2a4 4 0 1 0 .5 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.6 5.6 14.1 8.7 11.1 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
