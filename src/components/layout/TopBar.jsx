/* ═══════════════════════════════════════════════════════════
   TopBar — ClearTask (Header + Search)
   ═══════════════════════════════════════════════════════════ */

import { useRef, useState, useEffect, useCallback } from 'react';
import NotificationPanel from '../NotificationPanel';

export default function TopBar({
  title,
  searchQuery,
  onSearchChange,
  onSettingsOpen,
  onNotifOpen,
  showNotif,
  onNotifClose,
  allTransactions,
  onHelpOpen,
}) {
  const notifRef = useRef(null);

  // PWA Install state
  const [canInstall, setCanInstall] = useState(!!window.__pwaInstallPrompt);

  useEffect(() => {
    function onReady() {
      setCanInstall(true);
    }
    function onInstalled() {
      setCanInstall(false);
    }
    window.addEventListener('pwainstallready', onReady);
    window.addEventListener('pwainstalled', onInstalled);
    return () => {
      window.removeEventListener('pwainstallready', onReady);
      window.removeEventListener('pwainstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = window.__pwaInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') {
      setCanInstall(false);
    }
    window.__pwaInstallPrompt = null;
  }, []);

  return (
    <header className="flex items-center justify-between gap-4 mb-6 lg:mb-8">
      {/* Left: Title (mobile shows ClearTask branding) */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="lg:hidden w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00ffa3"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-text-primary tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Search + Settings */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="global-search"
            type="text"
            aria-label="Pencarian global"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-48 lg:w-64 pl-10 pr-4 py-2.5 text-sm neo-pressed border border-transparent rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary transition-all outline-none"
          />
        </div>

        {/* PWA Install Button */}
        {canInstall && (
          <button
            aria-label="Install Aplikasi"
            onClick={handleInstall}
            className="flex items-center justify-center min-h-[44px] gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all motion-safe:animate-pulse cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="hidden sm:inline">Install</span>
          </button>
        )}

        {/* Help Icon (Mobile Only) */}
        <button
          aria-label="Bantuan"
          onClick={onHelpOpen}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl neo-flat active:neo-pressed transition-all cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8b949e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Settings Icon */}
        <button
          aria-label="Pengaturan"
          onClick={onSettingsOpen}
          className="w-11 h-11 flex items-center justify-center rounded-xl neo-flat active:neo-pressed transition-all cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8b949e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Notification Icon */}
        <div className="relative" ref={notifRef}>
          <button
            aria-label="Notifikasi"
            onClick={onNotifOpen}
            className="w-11 h-11 flex items-center justify-center rounded-xl neo-flat active:neo-pressed transition-all cursor-pointer relative"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8b949e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <NotificationPanel
            isOpen={showNotif}
            onClose={onNotifClose}
            transactions={allTransactions || []}
          />
        </div>
      </div>
    </header>
  );
}
