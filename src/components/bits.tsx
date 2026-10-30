import { Fragment, createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { PHASE_NAME } from '../sim/diagnose';
import type { Phase } from '../sim/types';

// ---------------------------------------------------------------------------
// Phase marks: every phase has a color, a shape, and a name, so the meaning
// never rests on color alone.

export function PhaseShape({ phase, size = 12 }: { phase: Phase; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 12 12', 'aria-hidden': true, className: `shape ph-${phase}` } as const;
  switch (phase) {
    case 'init':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M6 0.6 11.4 6 6 11.4 0.6 6Z" />
        </svg>
      );
    case 'body':
      return (
        <svg {...common}>
          <rect x="1" y="1" width="10" height="10" rx="1.5" />
        </svg>
      );
    case 'update':
      return (
        <svg {...common}>
          <path d="M6 0.8 11.6 11H0.4Z" />
        </svg>
      );
    case 'exit':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.2" fill="none" strokeWidth="2.2" className="ring" />
        </svg>
      );
  }
}

export function PhaseMark({ phase, label }: { phase: Phase; label?: string }) {
  return (
    <span className={`phase-mark ph-${phase}`}>
      <PhaseShape phase={phase} />
      <span>{label ?? PHASE_NAME[phase]}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Messages use `backticks` for code.

export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, k) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <code key={k} className="ic">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={k}>{part}</Fragment>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Design notes overlay: small callouts that name the course concept behind a
// feature. Off for learners; on with ?notes or the Design notes button, for
// the progress video.

export const NotesContext = createContext(false);

export function DesignNote({ children, cite }: { children: ReactNode; cite: string }) {
  const on = useContext(NotesContext);
  if (!on) return null;
  return (
    <aside className="design-note" aria-label="Design note">
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 2.5h4.5A1.5 1.5 0 0 1 8 4v9.5A1.5 1.5 0 0 0 6.5 12H2zM14 2.5H9.5A1.5 1.5 0 0 0 8 4v9.5A1.5 1.5 0 0 1 9.5 12H14z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span>
        {children} <cite>{cite}</cite>
      </span>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts that stay out of the way of typing and focused buttons.

export function useKeys(handler: (e: KeyboardEvent) => boolean | void, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (ref.current(e) === true) e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [active]);
}

/** Is the event coming from somewhere the person is typing or has focused a control? */
export function fromControl(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || el.isContentEditable;
}

export function fromTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** A primary button that ignores activation for a moment after it appears, so
 *  the Enter that submitted an answer can't also skip the feedback. */
export function SettleButton({ onClick, children, autoFocus, className = 'btn btn-primary', settle = 400 }: { onClick: () => void; children: ReactNode; autoFocus?: boolean; className?: string; settle?: number }) {
  const born = useRef(performance.now());
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <button
      ref={ref}
      type="button"
      className={className}
      onClick={() => {
        if (performance.now() - born.current < settle) return;
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="check-icon">
      <path d="M3 8.4 6.4 11.6 13 4.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Scroll an element into view only as far as needed, without animation when motion is reduced. */
export function revealNearest(el: Element | null) {
  if (!el) return;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
}
