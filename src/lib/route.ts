import { useEffect, useState } from 'react';

// Hash routes keep GitHub Pages happy: there is only one real page.
// Routes are plain names (#orientation, #problem-2, #try-p07) so a link
// survives anywhere a bare #name does; the older #/problem/2 form still parses.
export type Route =
  | { name: 'start' }
  | { name: 'orientation' }
  | { name: 'problem'; index: number }
  | { name: 'done' }
  | { name: 'bank' }
  | { name: 'try'; id: string };

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '').trim();
  const m = h.match(/^([a-z]+)(?:[-/]([a-z0-9]+))?\/?$/i);
  if (!m) return { name: 'start' };
  const [, a, b] = m;
  switch (a.toLowerCase()) {
    case 'orientation':
      return { name: 'orientation' };
    case 'problem':
      return b && /^\d+$/.test(b) ? { name: 'problem', index: Number(b) } : { name: 'start' };
    case 'done':
      return { name: 'done' };
    case 'bank':
      return { name: 'bank' };
    case 'try':
      return b ? { name: 'try', id: b.toUpperCase() } : { name: 'bank' };
    default:
      return { name: 'start' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'start':
      return '#start';
    case 'orientation':
      return '#orientation';
    case 'problem':
      return `#problem-${r.index}`;
    case 'done':
      return '#done';
    case 'bank':
      return '#bank';
    case 'try':
      return `#try-${r.id.toLowerCase()}`;
  }
}

export function go(r: Route) {
  window.location.hash = href(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Move keyboard focus to the main region without touching the URL hash (which drives routing). */
export function skipToMain(e: { preventDefault: () => void }) {
  e.preventDefault();
  const main = document.getElementById('main');
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus();
  }
}
