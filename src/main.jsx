/* ═══════════════════════════════════════════════════════════
   main.jsx — ClearTask Entry Point
   PWA Service Worker registration included
   ═══════════════════════════════════════════════════════════ */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ─── PWA: Service Worker Registration ─────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[ClearTask] SW registered, scope:', reg.scope);
    } catch (err) {
      console.warn('[ClearTask] SW registration skipped:', err.message);
    }
  });
}

// ─── PWA: Install Prompt ──────────────────────────────────
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[ClearTask] Install prompt captured');
});

window.addEventListener('appinstalled', () => {
  console.log('[ClearTask] PWA installed successfully');
  deferredPrompt = null;
});
