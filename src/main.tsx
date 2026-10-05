import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dev-only handle for automated UI tests (stripped from production builds).
if (import.meta.env.DEV) {
  import('./store/game').then(({ useGame }) => {
    (window as unknown as { __game: typeof useGame }).__game = useGame;
  });
}
