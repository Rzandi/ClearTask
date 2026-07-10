/* ═══════════════════════════════════════════════════════════
   App.jsx — ClearTask Root Component
   Tab-based routing: Input Penjualan ↔ Laporan & Export
   Integrates session management via useSession hook
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, lazy, Suspense, useEffect } from 'react';
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

// Lazy-loaded modals — only downloaded when first opened (perf-report.md W4-1)
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const ClosingReportModal = lazy(() => import('./components/ClosingReportModal'));
const ConfirmDialog = lazy(() => import('./components/ConfirmDialog'));
const LaporanExport = lazy(() => import('./components/LaporanExport'));
const TabDatabase = lazy(() => import('./components/TabDatabase'));
const RiwayatSesi = lazy(() => import('./components/RiwayatSesi'));
const RestockAnalysis = lazy(() => import('./pages/RestockAnalysis'));
const InputKeluaran = lazy(() => import('./components/InputKeluaran'));

export default function App() {
  const { settings } = useSettings();

  // Sync missing categories on startup to repair old/new preset mismatches
  useEffect(() => {
    syncMissingCategories().catch((err) => {
      console.error('Failed to sync missing categories on startup:', err);
    });
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    return window.location.hash.replace('#', '') || 'input';
  });

  // Handle browser back/forward buttons (PopState)
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') || 'input';
      setActiveTab(hash);
    };

    window.addEventListener('popstate', handlePopState);

    // Set initial state without adding to history stack if no hash exists
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#input');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    window.history.pushState(null, '', '#' + newTab);
  }, []);
  const [toast, setToast] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── 18.2 Session state ──
  const [showClosingReport, setShowClosingReport] = useState(false);
  const [closingReportData, setClosingReportData] = useState<any>(null);

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
        setToast({ message: 'Transaksi berhasil disimpan!', type: 'success' });
        return result;
      } catch (err: any) {
        const isQuota =
          err.name === 'QuotaExceededError' ||
          (err.message && err.message.includes('QuotaExceededError')) ||
          (err.inner && err.inner.name === 'QuotaExceededError');
        const errMsg = isQuota
          ? 'Penyimpanan Penuh! Transaksi gagal disimpan ke IndexedDB. Silakan hapus data lama atau lakukan ekspor backup.'
          : err.message || 'Gagal menyimpan transaksi';
        setToast({ message: errMsg, type: 'error' });
      }
    },
    [addTransaction]
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
        setToast({ message: 'Sesi berhasil dibuka!', type: 'success' });
      } catch (err: any) {
        const isQuota =
          err.name === 'QuotaExceededError' ||
          (err.message && err.message.includes('QuotaExceededError')) ||
          (err.inner && err.inner.name === 'QuotaExceededError');
        const errMsg = isQuota
          ? 'Penyimpanan Penuh! Gagal membuka sesi ke IndexedDB. Silakan hapus data lama atau lakukan ekspor backup.'
          : err.message || 'Gagal membuka sesi';
        setToast({ message: errMsg, type: 'error' });
      }
    },
    [openSession]
  );

  // ── 18.5 handleConfirmCloseSession ──
  const handleConfirmCloseSession = useCallback(async () => {
    try {
      const closedSession = await closeSession();
      // Changed to async: getSessionTransactionsAsync
      const sessionTxs = await getSessionTransactionsAsync(closedSession.id);
      setClosingReportData({ session: closedSession, transactions: sessionTxs });
      setShowClosingReport(true);
    } catch (err: any) {
      const isQuota =
        err.name === 'QuotaExceededError' ||
        (err.message && err.message.includes('QuotaExceededError')) ||
        (err.inner && err.inner.name === 'QuotaExceededError');
      const errMsg = isQuota
        ? 'Penyimpanan Penuh! Gagal menutup sesi ke IndexedDB. Silakan hapus data lama atau lakukan ekspor backup.'
        : err.message || 'Gagal menutup sesi';
      setToast({ message: errMsg, type: 'error' });
    }
  }, [closeSession, getSessionTransactionsAsync]);

  // ── 18.4 handleCloseSessionRequest ──
  const handleCloseSessionRequest = useCallback(() => {
    setShowConfirmClose(true);
  }, []);

  const handleConfirmClose = useCallback(async () => {
    setShowConfirmClose(false);
    
    if (autoBackupOnClose) {
      try {
        await exportDatabase();
        setToast({ message: 'Backup database otomatis berhasil!', type: 'success' });
      } catch (err) {
        setToast({ message: 'Gagal melakukan backup otomatis.', type: 'error' });
      }
    }
    
    handleConfirmCloseSession();
  }, [handleConfirmCloseSession, autoBackupOnClose]);

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
          ) : activeTab === 'spk' ? (
            <RestockAnalysis />
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

        {/* Toast Notification */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AppShell>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

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
          <label htmlFor="auto-backup" className="text-sm font-medium text-text-primary cursor-pointer select-none">
            Download backup database sebelum tutup
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
