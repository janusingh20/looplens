import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/atkinson-hyperlegible-mono';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { storedTheme } from './lib/prefs';

// an explicit choice wins; otherwise the page follows the system theme
const t = storedTheme();
if (t) document.documentElement.dataset.theme = t;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
