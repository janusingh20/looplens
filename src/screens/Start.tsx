import { DesignNote } from '../components/bits';
import { Anatomy } from '../components/Diagrams';
import { SLICE } from '../content/problems';
import { href } from '../lib/route';

export function Start() {
  return (
    <main className="start" id="main">
      <Anatomy />
      <div className="start-copy">
        <h1 className="display">Predict every step of a Java for loop.</h1>
        <p className="lede">
          LoopLens shows you a short loop and asks you to call each step before Java runs it. When a prediction is off, you see exactly which step went wrong and why.
        </p>
        <div className="start-actions">
          <a className="btn btn-primary btn-lg" href={href({ name: 'orientation' })}>
            Start
          </a>
          <p className="start-time">About 10 minutes</p>
        </div>
        <ul className="facts">
          <li>A short warm up, then {SLICE.length} problems that start fully worked out and end with you tracing on your own.</li>
          <li>Runs in your browser. Nothing to install, no account.</li>
          <li>Your answers stay in this browser and are saved without your name.</li>
        </ul>
        <p className="start-more">
          <a className="link-quiet" href={href({ name: 'bank' })}>
            Problem bank and Java verification
          </a>
        </p>
        <DesignNote cite="Proposal constraints C1, C2, C5">Short session, no install or account, and anonymous answers.</DesignNote>
      </div>
    </main>
  );
}
