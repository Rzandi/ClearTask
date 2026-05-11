/* ═══════════════════════════════════════════════════════════
   App.jsx — ClearTask Root Component
   Tab-based routing: Input Penjualan ↔ Laporan & Export
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';
import AppShell from './components/layout/AppShell';
import TopBar from './components/layout/TopBar';
import InputPenjualan from './components/InputPenjualan';
import LaporanExport from './components/LaporanExport';
import Toast from './components/Toast';
import { useTransactions } from './hooks/useTransactions';

export default function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [toast, setToast] = useState(null);

  const {
    transactions,
    allTransactions,
    todayMetrics,
    addTransaction,
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

  const pageTitle = activeTab === 'input' ? 'Pencatatan Penjualan' : 'Pencatatan Penjualan';

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      <TopBar
        title={pageTitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Tab Content */}
      {activeTab === 'input' ? (
        <InputPenjualan onSubmit={handleSubmit} />
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
  );
}
