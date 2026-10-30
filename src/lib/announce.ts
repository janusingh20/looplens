// One polite live region, present from the first render, for messages that
// appear without a focus change: feedback on a prediction, a finished problem.
// A region created at the same moment as its message is often not read aloud.

export const ANNOUNCER_ID = 'announcer';

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: string[] = [];

/** Queue a message for screen readers. Messages sent in the same moment are
 *  read together, in order; `lead` puts this one first (a page title, say). */
export function announce(message: string, lead = false) {
  const text = message.replace(/`/g, '').trim();
  if (!text || typeof document === 'undefined') return;
  if (lead) pending.unshift(text);
  else pending.push(text);
  if (timer) clearTimeout(timer);
  // clear first, so the same sentence twice in a row is still read
  const el = document.getElementById(ANNOUNCER_ID);
  if (el) el.textContent = '';
  timer = setTimeout(() => {
    const target = document.getElementById(ANNOUNCER_ID);
    if (target) target.textContent = pending.join(' ');
    pending = [];
    timer = null;
  }, 80);
}
