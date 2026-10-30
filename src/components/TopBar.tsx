import type { ReactNode } from 'react';
import { CheckIcon } from './bits';
import { LensMark } from './Diagrams';
import { href } from '../lib/route';

export interface ProgressStep {
  label: string;
  state: 'done' | 'current' | 'todo';
  href: string;
}

export function TopBar({
  progress,
  notes,
  onNotes,
  dark,
  onTheme,
  extra,
}: {
  progress?: ProgressStep[];
  notes: boolean;
  onNotes: () => void;
  dark: boolean;
  onTheme: () => void;
  extra?: ReactNode;
}) {
  return (
    <header className="topbar">
      <a className="wordmark" href={href({ name: 'start' })} aria-label="LoopLens, back to the start">
        <LensMark />
        <span className="wordmark-text">LoopLens</span>
      </a>
      {progress && (
        <ol className="progress" aria-label="Problems in this preview">
          {progress.map((p, k) => (
            <li key={k} className={`is-${p.state}`}>
              <a href={p.href} aria-current={p.state === 'current' ? 'step' : undefined} aria-label={`Problem ${k + 1}: ${p.label}${p.state === 'done' ? ', done' : ''}`}>
                <span className="progress-n">{k + 1}</span>
                <span className="progress-label">{p.label}</span>
                {p.state === 'done' && <CheckIcon size={14} />}
              </a>
            </li>
          ))}
        </ol>
      )}
      <div className="topbar-tools">
        {extra}
        <button type="button" className={`tool${notes ? ' is-on' : ''}`} aria-pressed={notes} aria-label="Design notes" onClick={onNotes} title="Show the course concept behind each feature">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2.5h4.5A1.5 1.5 0 0 1 8 4v9.5A1.5 1.5 0 0 0 6.5 12H2zM14 2.5H9.5A1.5 1.5 0 0 0 8 4v9.5A1.5 1.5 0 0 1 9.5 12H14z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <span className="tool-label">Design notes</span>
        </button>
        <button type="button" className="tool tool-icon" onClick={onTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>
          {dark ? (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="3.2" fill="currentColor" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M13.5 10.2A5.8 5.8 0 0 1 5.8 2.5a5.8 5.8 0 1 0 7.7 7.7z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
