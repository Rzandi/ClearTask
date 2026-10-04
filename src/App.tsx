/* ═══════════════════════════════════════════════════════════
   App.jsx — ClearTask Root Component
   Tab-based routing: Input Penjualan ↔ Laporan & Export
   Integrates session management via useSession hook
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, Suspense, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import TopBar from './components/layout/TopBar';
import InputPenjualan from './components/InputPenjualan';
import Toast from './components/Toast';
import PromptDialog from './components/PromptDialog';
import Skeleton from './components/ui/Skeleton';
import { useTransactions } from './hooks/useTransactions';
import { useSession } from './hooks/useSession';
import { useSettings } from './contexts/SettingsContext';
import { syncMissingCategories, exportDatabase } from './services/databaseManager';
import { getDexieErrorMessage } from './utils/errorMessages';
import db from './services/db';
import type { ToastItem, ClosingReportData } from './types/index';
import { SHORTCUTS } from './constants/shortcuts';

import { lazyWithRetry } from './utils/resiliencyGuards';

import HotkeyModal from './components/HotkeyModal';
import SetupWizardModal from './components/SetupWizardModal';

// Lazy-loaded modals with Chunk Retry Handler (Item 23)
const SettingsModal = lazyWithRetry(() => import('./components/SettingsModal'));
const HelpModal = lazyWithRetry(() => import('./components/HelpModal'));
const ClosingReportModal = lazyWithRetry(() => import('./components/ClosingReportModal'));
const ConfirmDialog = lazyWithRetry(() => import('./components/ConfirmDialog'));
const LaporanExport = lazyWithRetry(() => import('./components/LaporanExport'));
const TabDatabase = lazyWithRetry(() => import('./components/TabDatabase'));
const RiwayatSesi = lazyWithRetry(() => import('./components/RiwayatSesi'));
const InputKeluaran = lazyWithRetry(() => import('./components/InputKeluaran'));
const TrashManager = lazyWithRetry(() => import('./components/TrashManager'));

export default function App() {
  const { settings, updateSettings } = useSettings();

  // Sync missing categories on startup to repair old/new preset mismatches
  useEffect(() => {
    syncMissingCategories().catch((err) => {
      console.error('Failed to sync missing categories on startup:', err);
    });
  }, []);

  const VALID_TABS = ['input', 'keluaran', 'database', 'riwayat-sesi', 'trash', 'laporan'];

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    // S5.4: Normalize invalid hash — kalau tidak valid, fallback ke 'input'
    return VALID_TABS.includes(hash) ? hash : 'input';
  });

  // Handle browser back/forward buttons (PopState)
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') || 'input';
      setActiveTab(VALID_TABS.includes(hash) ? hash : 'input');
    };

    window.addEventListener('popstate', handlePopState);

    // S5.4: Always ensure URL hash is valid on mount
    const currentHash = window.location.hash.replace('#', '');
    if (!VALID_TABS.includes(currentHash)) {
      window.history.replaceState(null, '', '#input');
    } else if (!window.location.hash) {
      window.history.replaceState(null, '', '#input');
    }

    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    window.history.pushState(null, '', '#' + newTab);
  }, []);

  const [showHotkeyModal, setShowHotkeyModal] = useState(false);

  // ── W0-05: F-key confirmation guard when inside input fields ──
  const [fKeyConfirm, setFKeyConfirm] = useState<{
    open: boolean;
    label: string;
    action: (() => void) | null;
  }>({ open: false, label: '', action: null });
  const [showSetupWizard, setShowSetupWizard] = useState(() => {
    try {
      return localStorage.getItem('cleartask_setup_completed') !== 'true';
    } catch {
      return false;
    }
  });

  // ── W0-05: Helper to execute or confirm F-key action ──
  const execOrConfirmFKey = useCallback((inInput: boolean, label: string, action: () => void) => {
    if (inInput) {
      setFKeyConfirm({ open: true, label, action });
    } else {
      action();
    }
  }, []);

  const handleFKeyConfirm = useCallback(() => {
    fKeyConfirm.action?.();
    setFKeyConfirm({ open: false, label: '', action: null });
  }, [fKeyConfirm]);

  const handleFKeyCancel = useCallback(() => {
    setFKeyConfirm({ open: false, label: '', action: null });
  }, []);

  // Subkategori F17 & F18: Global Keyboard Shortcuts & Kiosk/Outdoor mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: e.key bisa undefined pada IME input atau beberapa synthetic events
      if (!e.key) return;

      const target = e.target as HTMLElement;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
      // Allow F-keys and special combos even inside inputs
      const isAllowed =
        e.key.startsWith('F') ||
        (e.altKey && e.key.toLowerCase() === SHORTCUTS.HELP_ALT.key) ||
        (e.altKey && e.key.toLowerCase() === SHORTCUTS.OUTDOOR_MODE.key) ||
        e.key === SHORTCUTS.HELP_QUESTION.key ||
        (e.shiftKey && e.key === '/');
      if (inInput && !isAllowed) return;

      // F1 / Alt+H / ? — always instant (no confirmation needed)
      if (
        e.key === SHORTCUTS.HELP.key ||
        (e.altKey && e.key.toLowerCase() === SHORTCUTS.HELP_ALT.key)
      ) {
        e.preventDefault();
        setShowHotkeyModal((prev) => !prev);
      } else if (e.key === SHORTCUTS.HELP_QUESTION.key || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowHotkeyModal((prev) => !prev);
      } else if (e.key === SHORTCUTS.INPUT_TAB.key) {
        e.preventDefault();
        execOrConfirmFKey(inInput, 'Pindah ke POS Kasir (F2)', () => handleTabChange('input'));
      } else if (e.key === SHORTCUTS.DATABASE_TAB.key) {
        e.preventDefault();
        execOrConfirmFKey(inInput, 'Pindah ke Database (F3)', () => handleTabChange('database'));
      } else if (e.key === SHORTCUTS.REPORT_TAB.key) {
        e.preventDefault();
        execOrConfirmFKey(inInput, 'Pindah ke Laporan (F4)', () => handleTabChange('laporan'));
      } else if (e.key === SHORTCUTS.FULLSCREEN.key) {
        e.preventDefault();
        execOrConfirmFKey(inInput, 'Toggle Fullscreen (F8)', () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        });
      } else if (e.altKey && e.key.toLowerCase() === SHORTCUTS.OUTDOOR_MODE.key) {
        e.preventDefault();
        updateSettings({ outdoorMode: !settings?.outdoorMode });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTabChange, execOrConfirmFKey, updateSettings, settings?.outdoorMode]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]); // max 3 toasts
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // W3-05: Periodic backup reminder (> 7 hari atau belum pernah backup)
  useEffect(() => {
    const alreadyReminded = sessionStorage.getItem('cleartask_backup_reminder_shown');
    if (alreadyReminded) return;

    db.meta
      .get({ key: 'lastBackupAt' })
      .then(async (record) => {
        const txCount = await db.transactions.count();
        if (txCount === 0) return;

        let diffDays = 999;
        if (record?.value) {
          const last = new Date(record.value);
          diffDays = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (diffDays >= 7) {
          sessionStorage.setItem('cleartask_backup_reminder_shown', 'true');
          addToast(
            diffDays >= 999
              ? '⚠️ Anda belum pernah membuat backup database. Buka tab Database untuk download backup & simpan salinannya di luar perangkat.'
              : `⚠️ Sudah ${diffDays} hari sejak backup database terakhir. Buka tab Database untuk download backup terbaru.`,
            'warning'
          );
        }
      })
      .catch(() => {});
  }, [addToast]);

  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── 18.2 Session state ──
  const [showClosingReport, setShowClosingReport] = useState(false);
  const [closingReportData, setClosingReportData] = useState<ClosingReportData | null>(null);

  // ── Dialog state ──
  const [showPromptSession, setShowPromptSession] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [autoBackupOnClose, setAutoBackupOnClose] = useState(true);

  const { activeSession, allSessions, openSession, closeSession, getSessionTransactionsAsync } =
    useSession();

  const {
    transactions,
    todayMetrics,
    totalCount,
    recentTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    searchQuery,
    setSearchQuery,
    filterDate,
    setFilterDate,
    sortOrder,
    setSortOrder,
  } = useTransactions();

  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        const result = await addTransaction(data);
        addToast('Transaksi berhasil disimpan!', 'success');
        return result;
      } catch (err: unknown) {
        addToast(getDexieErrorMessage(err), 'error');
      }
    },
    [addTransaction, addToast]
  );

  // ── 18.3 handleOpenSession ──
  const handleOpenSession = useCallback(() => {
    setShowPromptSession(true);
  }, []);

  const handleConfirmOpenSession = useCallback(
    async (nama: string) => {
      setShowPromptSession(false);

      // T3: Sanitize input (trim only, rely on React JSX for XSS prevention)
      const sanitizedNama = (nama || '').trim();

      try {
        await openSession(sanitizedNama);
        addToast('Sesi berhasil dibuka!', 'success');
      } catch (err: unknown) {
        addToast(getDexieErrorMessage(err), 'error');
      }
    },
    [openSession, addToast]
  );

  // ── 18.5 handleConfirmCloseSession ──
  const handleConfirmCloseSession = useCallback(async () => {
    try {
      const closedSession = await closeSession();
      // Changed to async: getSessionTransactionsAsync
      const sessionTxs = await getSessionTransactionsAsync(closedSession.id);
      setClosingReportData({ session: closedSession, transactions: sessionTxs });
      setShowClosingReport(true);
    } catch (err: unknown) {
      addToast(getDexieErrorMessage(err), 'error');
    }
  }, [closeSession, getSessionTransactionsAsync, addToast]);

  // ── 18.4 handleCloseSessionRequest ──
  const handleCloseSessionRequest = useCallback(() => {
    setShowConfirmClose(true);
  }, []);

  const handleConfirmClose = useCallback(async () => {
    setShowConfirmClose(false);

    if (autoBackupOnClose) {
      try {
        await exportDatabase();
        addToast('Backup database otomatis berhasil!', 'success');
      } catch (err: unknown) {
        addToast(getDexieErrorMessage(err), 'error');
      }
    }

    handleConfirmCloseSession();
  }, [handleConfirmCloseSession, autoBackupOnClose, addToast]);

  // ── 18.6 handleClosingReportClose ──
  const handleClosingReportClose = useCallback(() => {
    setShowClosingReport(false);
    setClosingReportData(null);
  }, []);

  const pageTitle = settings?.appSubtitle || settings?.tokoName || 'Pencatatan Penjualan';

  return (
    <>
      {/* 18.7 Pass activeSession to AppShell (which forwards to Sidebar and renders SessionBanner) */}
      <AppShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onHelpOpen={() => setShowHelp(true)}
        activeSession={activeSession}
        onCloseSession={handleCloseSessionRequest}
        onOpenSession={handleOpenSession}
      >
        <TopBar
          title={pageTitle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSettingsOpen={() => setShowSettings(true)}
          onNotifOpen={() => setShowNotif(true)}
          showNotif={showNotif}
          onNotifClose={() => setShowNotif(false)}
          allTransactions={recentTransactions}
          onHelpOpen={() => setShowHelp(true)}
        />

        {/* Tab Content */}
        <Suspense
          fallback={
            <div className="p-6 space-y-6">
              <Skeleton variant="title" className="w-1/3" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          }
        >
          {activeTab === 'input' ? (
            <InputPenjualan onSubmit={handleSubmit} activeSession={activeSession} />
          ) : activeTab === 'keluaran' ? (
            <InputKeluaran />
          ) : activeTab === 'database' ? (
            <TabDatabase />
          ) : activeTab === 'riwayat-sesi' ? (
            /* 19.5 Pass allSessions and getSessionTransactions */
            <RiwayatSesi
              allSessions={allSessions}
              getSessionTransactions={getSessionTransactionsAsync}
            />
          ) : activeTab === 'trash' ? (
            <TrashManager />
          ) : (
            <LaporanExport
              transactions={transactions}
              totalCount={totalCount}
              todayMetrics={todayMetrics}
              filterDate={filterDate}
              setFilterDate={setFilterDate}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              onUpdate={updateTransaction as any}
              onDelete={deleteTransaction}
            />
          )}
        </Suspense>

        {/* Toast Notifications — queue, max 3 */}
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </AppShell>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <HotkeyModal isOpen={showHotkeyModal} onClose={() => setShowHotkeyModal(false)} />
      <SetupWizardModal isOpen={showSetupWizard} onClose={() => setShowSetupWizard(false)} />

      {/* W0-05: F-key confirmation when pressed inside input fields */}
      <ConfirmDialog
        isOpen={fKeyConfirm.open}
        title="Konfirmasi Navigasi"
        message={`Anda sedang mengetik. Yakin ingin ${fKeyConfirm.label}? Input yang belum disimpan bisa hilang.`}
        confirmLabel="Lanjutkan"
        onConfirm={handleFKeyConfirm}
        onCancel={handleFKeyCancel}
      />

      {/* 18.8 ClosingReportModal */}
      <ClosingReportModal
        isOpen={showClosingReport}
        session={closingReportData?.session}
        transactions={closingReportData?.transactions ?? []}
        onClose={handleClosingReportClose}
      />

      <PromptDialog
        isOpen={showPromptSession}
        title="Buka Sesi Baru"
        message="Masukkan nama sesi (opsional):"
        placeholder="Cth: Shift Pagi"
        confirmText="Buka Sesi"
        onConfirm={handleConfirmOpenSession}
        onCancel={() => setShowPromptSession(false)}
      />

      <ConfirmDialog
        isOpen={showConfirmClose}
        message="Yakin ingin menutup sesi ini? Transaksi baru tidak bisa ditambahkan ke sesi yang sudah ditutup."
        onConfirm={handleConfirmClose}
        onCancel={() => setShowConfirmClose(false)}
      >
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-backup"
            checked={autoBackupOnClose}
            onChange={(e) => setAutoBackupOnClose(e.target.checked)}
            className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary focus:ring-offset-bg-elevated bg-bg-surface"
          />
          <label
            htmlFor="auto-backup"
            className="text-sm font-medium text-text-primary cursor-pointer select-none"
          >
            Download backup database sebelum tutup
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
