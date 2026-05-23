/// <reference types="vite/client" />
/* ═══════════════════════════════════════════════════════════
   main.jsx — ClearTask Entry Point
   PWA Service Worker registration included
   ═══════════════════════════════════════════════════════════ */

import { StrictMode } from 'react';

declare global {
  interface Window {
    __pwaInstallPrompt: any;
    __pwaInstalled: boolean;
  }
}
import { createRoot } from 'react-dom/client';
import App from './App';
import AppBootstrap from './components/AppBootstrap';
import ErrorBoundary from './components/ErrorBoundary';
import { SettingsProvider } from './contexts/SettingsContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppBootstrap>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </AppBootstrap>
    </ErrorBoundary>
  </StrictMode>
);

// ─── PWA: Service Worker Registration ─────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // In dev mode: unregister all SWs and clear all caches to prevent
    // stale JS files from causing "Invalid hook call" / duplicate React errors.
    if (import.meta.env.DEV) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
        console.log('[ClearTask] DEV: SW unregistered to prevent cache issues');
      }
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log('[ClearTask] DEV: Cache cleared:', name);
      }
      return; // Don't register SW in dev mode
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[ClearTask] SW registered, scope:', reg.scope);
    } catch (err: any) {
      console.warn('[ClearTask] SW registration skipped:', err.message);
    }
  });
}

// ─── PWA: Install Prompt ──────────────────────────────────
// Capture the install prompt for a custom install button
window.__pwaInstallPrompt = null;
window.__pwaInstalled = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
  // Dispatch custom event so React components can react
  window.dispatchEvent(new Event('pwainstallready'));
  console.log('[ClearTask] Install prompt captured');
});

window.addEventListener('appinstalled', () => {
  console.log('[ClearTask] PWA installed successfully');
  window.__pwaInstallPrompt = null;
  window.__pwaInstalled = true;
  window.dispatchEvent(new Event('pwainstalled'));
});
