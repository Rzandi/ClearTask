/* ═══════════════════════════════════════════════════════════
   App.jsx — ClearTask Root Component
   Tab-based routing: Input Penjualan ↔ Laporan & Export
   Integrates session management via useSession hook
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';
import AppShell from './components/layout/AppShell';
import TopBar from './components/layout/TopBar';
import InputPenjualan from './components/InputPenjualan';
import LaporanExport from './components/LaporanExport';
import TabDatabase from './components/TabDatabase';
import Toast from './components/Toast';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import ClosingReportModal from './components/ClosingReportModal';
import RiwayatSesi from './components/RiwayatSesi';
import { useTransactions } from './hooks/useTransactions';
import { useSession } from './hooks/useSession';

export default function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── 18.2 Session state ──
  const [showClosingReport, setShowClosingReport] = useState(false);
  const [closingReportData, setClosingReportData] = useState(null);

  // ── 18.1 useSession hook ──
  const {
    activeSession,
    allSessions,
    openSession,
    closeSession,
    getSessionTransactions,
  } = useSession();

  const {
    transactions,
    allTransactions,
    todayMetrics,
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
    (data) => {
      addTransaction(data);
      setToast({ message: 'Transaksi berhasil disimpan!', type: 'success' });
    },
    [addTransaction]
  );

  // ── 18.3 handleOpenSession ──
  const handleOpenSession = useCallback(() => {
    const nama = window.prompt('Nama sesi (opsional):', '');
    // If user cancelled (pressed Cancel), prompt returns null
    if (nama === null) return;

    try {
      openSession(nama || '');
      setToast({ message: 'Sesi berhasil dibuka!', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Gagal membuka sesi', type: 'error' });
    }
  }, [openSession]);

  // ── 18.5 handleConfirmCloseSession ──
  const handleConfirmCloseSession = useCallback(() => {
    try {
      const closedSession = closeSession();
      const sessionTxs = getSessionTransactions(closedSession.id);
      setClosingReportData({ session: closedSession, transactions: sessionTxs });
      setShowClosingReport(true);
    } catch (err) {
      setToast({ message: err.message || 'Gagal menutup sesi', type: 'error' });
    }
  }, [closeSession, getSessionTransactions]);

  // ── 18.4 handleCloseSessionRequest ──
  const handleCloseSessionRequest = useCallback(() => {
    const confirmed = window.confirm('Tutup sesi ini?');
    if (confirmed) {
      handleConfirmCloseSession();
    }
  }, [handleConfirmCloseSession]);

  // ── 18.6 handleClosingReportClose ──
  const handleClosingReportClose = useCallback(() => {
    setShowClosingReport(false);
    setClosingReportData(null);
  }, []);

  const pageTitle = 'Pencatatan Penjualan';

  return (
    <>
      {/* 18.7 Pass activeSession to AppShell (which forwards to Sidebar and renders SessionBanner) */}
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
          allTransactions={allTransactions}
          onHelpOpen={() => setShowHelp(true)}
        />

        {/* Tab Content */}
        {activeTab === 'input' ? (
          /* 18.7 Pass activeSessionId to InputPenjualan */
          <InputPenjualan
            onSubmit={handleSubmit}
            activeSessionId={activeSession?.id ?? null}
          />
        ) : activeTab === 'database' ? (
          <TabDatabase />
        ) : activeTab === 'riwayat-sesi' ? (
          /* 19.5 Pass allSessions and getSessionTransactions */
          <RiwayatSesi
            allSessions={allSessions}
            getSessionTransactions={getSessionTransactions}
          />
        ) : (
          <LaporanExport
            transactions={transactions}
            allTransactions={allTransactions}
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

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
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
    </>
  );
}
