// Small per viewer preferences. Every storage access is guarded: private
// windows and blocked storage must never break the page.

export type Theme = 'light' | 'dark';
export type Condition = 'predict' | 'watch';

const THEME_KEY = 'looplens.theme';

export function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}

const params = () => new URLSearchParams(window.location.search);

/** ?condition=watch turns predictions off (the evaluation's comparison condition). */
export function urlCondition(): Condition {
  return params().get('condition') === 'watch' ? 'watch' : 'predict';
}

/** ?notes shows the design notes overlay from the start (the Design notes button toggles it too). */
export function urlNotes(): boolean {
  const n = params().get('notes');
  return n !== null && n !== '0' && n !== 'false';
}
