import { useState } from 'react';
import { DesignNote, PhaseMark, Rich } from '../components/bits';
import { Anatomy, PhaseCycle } from '../components/Diagrams';
import { BoolChoice, TypedAnswer } from '../components/Inputs';
import { announce } from '../lib/announce';
import { log } from '../lib/log';
import { href } from '../lib/route';

// Orientation: the four phases as subgoal labels, then two warm ups that
// check the prerequisites tracing depends on (constraint C4).

interface Result {
  right: boolean;
  text: string;
}

function WarmUp({ n, children, review, right, answer }: { n: number; children: React.ReactNode; review: string; right: string; answer: (given: string) => boolean }) {
  const [res, setRes] = useState<Result | null>(null);
  const done = (given: string) => {
    const ok = answer(given);
    const text = ok ? right : review;
    setRes({ right: ok, text });
    announce(text);
    log('warmup', { item: n, answer: given, correct: ok });
  };
  return (
    <li className="warmup-item">
      <div className="warmup-q">{children}</div>
      {!res ? (
        n === 1 ? (
          <TypedAnswer formId={`warm-${n}`} kind="number" label="What is x now?" onAnswer={done} submitLabel="Check" size={4} autoFocus={false} />
        ) : (
          <BoolChoice label="Is 6 <= 6 true or false?" onAnswer={(b) => done(String(b))} autoFocus={false} keys={false} />
        )
      ) : (
        <p className={`warmup-res${res.right ? ' is-right' : ' is-wrong'}`}>
          <Rich text={res.text} />
        </p>
      )}
    </li>
  );
}

export function Orientation() {
  return (
    <main className="page orient" id="main">
      <h1>Every for loop runs in four phases, then exits</h1>
      <p className="lede">
        You write the three parts of a loop header on one line, but Java runs them at different times. LoopLens names every step with one of these phases, or with exit once the loop is over. Use the names as a checklist when you trace.
      </p>
      <Anatomy compact />
      <PhaseCycle />
      <div className="keyfacts">
        <p className="keyfacts-lead">Two facts explain most loop surprises:</p>
        <ul>
          <li>
            <span>The</span> <PhaseMark phase="check" /> <span>runs before every pass, even the first one.</span>
          </li>
          <li>
            <span>The</span> <PhaseMark phase="update" /> <span>runs after every pass, even the last one.</span>
          </li>
        </ul>
      </div>
      <DesignNote cite="Margulieux 2012; Morrison 2015">The phase names are subgoal labels, introduced before any practice and reused on every step.</DesignNote>

      <section className="warmup" aria-labelledby="warmup-title">
        <h2 id="warmup-title">Two quick warm ups</h2>
        <p>Loops lean on two older ideas: updating a variable and comparing numbers. If either one is shaky, the explanation will cover it.</p>
        <ol className="warmup-list">
          <WarmUp
            n={1}
            answer={(g) => Number(g) === 7}
            right="Right. `x = x + 3` reads the current value of `x` (4), adds 3, and stores 7 back in `x`. Loops do this on every pass."
            review="Not quite. `x = x + 3` reads the current value of `x` (4), adds 3, and stores the result back in `x`, so `x` is now 7. Loops do this on every pass."
          >
            <pre className="snippet">
              <code>{'int x = 4;\nx = x + 3;'}</code>
            </pre>
            <p>What is <code className="ic">x</code> now?</p>
          </WarmUp>
          <WarmUp
            n={2}
            answer={(g) => g === 'true'}
            right="Right. `<=` means less than or equal to, and 6 is equal to 6. Watch for the difference: `6 < 6` is false."
            review="Not quite. `<=` means less than or equal to, and 6 is equal to 6, so `6 <= 6` is true. By contrast, `6 < 6` is false."
          >
            <p>
              Is <code className="ic">6 &lt;= 6</code> true or false?
            </p>
          </WarmUp>
        </ol>
        <DesignNote cite="Proposal, constraint C4">Prerequisite check, so later feedback never assumes something the learner has not seen.</DesignNote>
      </section>

      <div className="orient-actions">
        <a className="btn btn-primary btn-lg" href={href({ name: 'problem', index: 1 })}>
          Start the worked example
        </a>
      </div>
    </main>
  );
}
