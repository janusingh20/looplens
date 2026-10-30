import { CheckIcon, Rich } from '../components/bits';
import { MISCONCEPTION_ORDER, MISCONCEPTIONS } from '../content/feedback';
import { byId, SLICE } from '../content/problems';
import { countVerdict, modeFor, score, type SessionState } from '../sim/session';
import type { Condition } from '../lib/prefs';
import type { MisconceptionId } from '../sim/types';
import { MODE_LABEL } from './ProblemScreen';
import { href } from '../lib/route';

// End of the Milestone 1 slice. In the full experience the post test and the
// learner's own counting rule come next; the rules summary stays as the
// checklist to take into the next coding assignment.

export function Done({ slice, onRestartAll, condition }: { slice: (SessionState | undefined)[]; onRestartAll: () => void; condition: Condition }) {
  const watch = condition === 'watch';
  const hits = new Map<MisconceptionId, number>();
  let asked = 0;
  let right = 0;
  for (const s of slice) {
    if (!s) continue;
    const sc = score(s);
    asked += sc.asked;
    right += sc.right;
    for (const m of sc.misconceptions) hits.set(m.id as MisconceptionId, (hits.get(m.id as MisconceptionId) ?? 0) + m.count);
    const cv = countVerdict(s);
    if (cv && !cv.correct && cv.misconception) hits.set(cv.misconception, (hits.get(cv.misconception) ?? 0) + 1);
  }
  const finished = slice.filter((s) => s?.stage === 'done').length;
  const all = finished === SLICE.length;
  const firstOpen = slice.findIndex((s) => s?.stage !== 'done');

  return (
    <main className="page done" id="main">
      <h1>{all ? 'You finished the preview' : 'Your progress so far'}</h1>
      <p className="lede">
        {all ? '' : `You have finished ${finished} of ${SLICE.length} problems. `}
        {watch
          ? 'These are the five rules the problems practice. Keep them as a checklist for your next coding assignment.'
          : 'These are the five rules LoopLens practices. The ones your predictions ran into are marked, so you know which to double check in your next coding assignment.'}
      </p>
      {!watch && asked > 0 && (
        <p className="recap">
          You made <strong>{asked}</strong> step {asked === 1 ? 'prediction' : 'predictions'} and got <strong>{right}</strong> right on the first try.
        </p>
      )}

      <ol className="rules">
        {MISCONCEPTION_ORDER.map((id) => {
          const n = hits.get(id) ?? 0;
          const m = MISCONCEPTIONS[id];
          return (
            <li key={id} className={n ? 'is-hit' : ''}>
              <div className="rules-head">
                <span className="mc-id">{id}</span>
                <span className="rules-name">{m.name}</span>
                {n > 0 && <span className="rules-count">came up {n === 1 ? 'once' : `${n} times`}</span>}
              </div>
              <p>
                <Rich text={m.rule} />
              </p>
            </li>
          );
        })}
      </ol>

      <section className="done-problems" aria-labelledby="done-p">
        <h2 id="done-p">Your problems</h2>
        <div className="table-scroll">
          <table className="simple">
            <thead>
              <tr>
                <th scope="col">Problem</th>
                <th scope="col">Kind</th>
                <th scope="col">{watch ? 'Status' : 'First try'}</th>
              </tr>
            </thead>
            <tbody>
              {SLICE.map((id, k) => {
                const p = byId(id);
                const mode = p ? modeFor(p, condition) : null;
                const s = slice[k];
                const sc = s ? score(s) : null;
                const cv = s ? countVerdict(s) : null;
                const done = s?.stage === 'done';
                return (
                  <tr key={id}>
                    <td>
                      <a href={href({ name: 'problem', index: k + 1 })}>{p?.title}</a>
                    </td>
                    <td>{mode ? MODE_LABEL[mode] : ''}</td>
                    <td>
                      {!done ? (
                        <span className="status-open">Not finished</span>
                      ) : (
                        <span className="status-done">
                          <CheckIcon size={14} />
                          {sc && sc.asked ? `${sc.right} of ${sc.asked} steps` : watch ? 'Stepped through' : 'Worked through'}
                          {cv ? `, pass count ${cv.correct ? 'right' : 'off'}` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="next-up" aria-labelledby="next-up">
        <h2 id="next-up">Still to come in the full version</h2>
        <ul>
          <li>Five more problems on your own, including a countdown, a loop that never runs, and one that runs exactly once.</li>
          <li>Two problems where you write the loop header yourself to get a given range.</li>
          <li>A three problem checkpoint with feedback at the end, and a short test before and after.</li>
        </ul>
      </section>

      {all ? (
        <div className="row-actions">
          <button type="button" className="btn btn-primary" onClick={onRestartAll}>
            Start over
          </button>
          <a className="btn" href={href({ name: 'bank' })}>
            See the problem bank
          </a>
        </div>
      ) : (
        <div className="row-actions">
          <a className="btn btn-primary" href={href({ name: 'problem', index: firstOpen + 1 })}>
            Go to problem {firstOpen + 1}
          </a>
          <button type="button" className="btn-quiet" onClick={onRestartAll}>
            Start over from the beginning
          </button>
        </div>
      )}
    </main>
  );
}
