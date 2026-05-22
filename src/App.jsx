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
import { useTransactions } from './hooks/useTransactions';
import { useSession } from './hooks/useSession';
import { useSettings } from './contexts/SettingsContext';

// Lazy-loaded modals — only downloaded when first opened (perf-report.md W4-1)
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const ClosingReportModal = lazy(() => import('./components/ClosingReportModal'));
const ConfirmDialog = lazy(() => import('./components/ConfirmDialog'));
const LaporanExport = lazy(() => import('./components/LaporanExport'));
const TabDatabase = lazy(() => import('./components/TabDatabase'));
const RiwayatSesi = lazy(() => import('./components/RiwayatSesi'));

export default function App() {
  const { settings } = useSettings();
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

  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);
    window.history.pushState(null, '', '#' + newTab);
  }, []);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── 18.2 Session state ──
  const [showClosingReport, setShowClosingReport] = useState(false);
  const [closingReportData, setClosingReportData] = useState(null);

  // ── Dialog state ──
  const [showPromptSession, setShowPromptSession] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

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
    async (data) => {
      try {
        await addTransaction(data);
        setToast({ message: 'Transaksi berhasil disimpan!', type: 'success' });
      } catch (err) {
        setToast({ message: err.message || 'Gagal menyimpan transaksi', type: 'error' });
      }
    },
    [addTransaction]
  );

  // ── 18.3 handleOpenSession ──
  const handleOpenSession = useCallback(() => {
    setShowPromptSession(true);
  }, []);

  const handleConfirmOpenSession = useCallback(
    async (nama) => {
      setShowPromptSession(false);

      // T3: Sanitize input (trim only, rely on React JSX for XSS prevention)
      const sanitizedNama = (nama || '').trim();

      try {
        await openSession(sanitizedNama);
        setToast({ message: 'Sesi berhasil dibuka!', type: 'success' });
      } catch (err) {
        setToast({ message: err.message || 'Gagal membuka sesi', type: 'error' });
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
    } catch (err) {
      setToast({ message: err.message || 'Gagal menutup sesi', type: 'error' });
    }
  }, [closeSession, getSessionTransactionsAsync]);

  // ── 18.4 handleCloseSessionRequest ──
  const handleCloseSessionRequest = useCallback(() => {
    setShowConfirmClose(true);
  }, []);

  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    handleConfirmCloseSession();
  }, [handleConfirmCloseSession]);

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
            <div className="flex justify-center items-center h-64 text-text-muted">
              <svg
                className="animate-spin h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          }
        >
          {activeTab === 'input' ? (
            <InputPenjualan onSubmit={handleSubmit} activeSession={activeSession} />
          ) : activeTab === 'database' ? (
            <TabDatabase />
          ) : activeTab === 'riwayat-sesi' ? (
            /* 19.5 Pass allSessions and getSessionTransactions */
            <RiwayatSesi
              allSessions={allSessions}
              getSessionTransactions={getSessionTransactionsAsync}
            />
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
              onUpdate={updateTransaction}
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
      />
    </>
  );
}
