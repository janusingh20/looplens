import { useEffect, useRef, useState } from 'react';
import { PHASE_NAME } from '../sim/diagnose';
import type { Phase } from '../sim/types';
import { Kbd, PhaseShape, revealNearest } from './bits';

/** A new field ignores Enter for a moment, so a doubled Enter meant for the
 *  previous question can't submit this one empty. A number field also never
 *  takes letters, so a doubled phase key (B, B) can't land in it. */
const ENTER_SETTLE_MS = 180;
const KEY_SETTLE_MS = 250;

/** A short typed answer: a whole number or a bit of output. The submit button can live elsewhere (form attribute). */
export function TypedAnswer({
  formId,
  kind,
  label,
  onAnswer,
  size = 5,
  submitLabel,
  autoFocus = true,
  reveal = false,
}: {
  formId: string;
  kind: 'number' | 'text';
  label: string;
  onAnswer: (raw: string) => void;
  size?: number;
  submitLabel?: string;
  autoFocus?: boolean;
  /** scroll the field into view when it takes focus */
  reveal?: boolean;
}) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const born = useRef(performance.now());
  useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus({ preventScroll: true });
    if (reveal) revealNearest(ref.current?.form ?? ref.current);
  }, [autoFocus, reveal]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = v.trim();
    if (kind === 'number' && !/^[+-]?\d+$/.test(t)) {
      setErr(t ? 'Type a whole number, like 4 or -2.' : 'Type a number first, like 4 or -2.');
      return;
    }
    if (kind === 'text' && !t) {
      setErr('Type what you expect to see.');
      return;
    }
    onAnswer(t);
  };
  const errId = `${formId}-err`;
  return (
    <form id={formId} className="typed" onSubmit={submit} noValidate>
      <input
        ref={ref}
        className="typed-input"
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? errId : undefined}
        value={v}
        size={size}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          const age = performance.now() - born.current;
          if (e.key === 'Enter' && autoFocus && age < ENTER_SETTLE_MS) e.preventDefault();
          else if (e.key.length === 1 && kind === 'number' && !/[0-9+-]/.test(e.key)) e.preventDefault();
          else if (e.key.length === 1 && kind === 'text' && autoFocus && age < KEY_SETTLE_MS) e.preventDefault();
        }}
        onChange={(e) => {
          setV(e.target.value);
          setErr('');
        }}
      />
      {submitLabel && (
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      )}
      {err && (
        <span id={errId} className="typed-err" role="alert">
          {err}
        </span>
      )}
    </form>
  );
}

// Choice groups take focus as a whole (not the first button), so a stray
// Enter press can never pick an answer by accident. In the trace table the
// letter keys answer; the table handles them, so they only work while focus
// is inside it.
export function BoolChoice({ label, onAnswer, autoFocus = true, keys = true }: { label: string; onAnswer: (b: boolean) => void; autoFocus?: boolean; keys?: boolean }) {
  const group = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus) group.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <div ref={group} tabIndex={-1} className="choice-group bool" role="group" aria-label={keys ? `${label} Press T for true or F for false.` : label}>
      <button type="button" className="btn btn-choice" onClick={() => onAnswer(true)}>
        true {keys && <Kbd>T</Kbd>}
      </button>
      <button type="button" className="btn btn-choice" onClick={() => onAnswer(false)}>
        false {keys && <Kbd>F</Kbd>}
      </button>
    </div>
  );
}

export const PHASE_KEYS: Record<Phase, string> = { init: 'I', check: 'C', body: 'B', update: 'U', exit: 'E' };
export const PHASE_ORDER: Phase[] = ['init', 'check', 'body', 'update', 'exit'];

export function PhaseChoice({ onAnswer }: { onAnswer: (p: Phase) => void }) {
  const group = useRef<HTMLDivElement>(null);
  useEffect(() => {
    group.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={group} tabIndex={-1} className="choice-group phase-choice" role="group" aria-label="Which phase runs next? Press I, C, B, U, or E.">
      {PHASE_ORDER.map((p) => (
        <button key={p} type="button" className={`btn btn-phase ph-${p}`} onClick={() => onAnswer(p)}>
          <PhaseShape phase={p} />
          <span>{PHASE_NAME[p]}</span>
          <Kbd>{PHASE_KEYS[p]}</Kbd>
        </button>
      ))}
    </div>
  );
}
