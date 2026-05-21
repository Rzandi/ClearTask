/* ═══════════════════════════════════════════════════════════
   TabDatabase — ClearTask
   Full-page tab for database stats, transaction table,
   and export/import actions. Reads directly from localStorage.
   ═══════════════════════════════════════════════════════════ */

import { useState, useRef, useMemo } from 'react';
import { formatRupiah, formatDate } from '../utils/formatters';
import { exportDatabase, validateImport, calculateMerge, applyMerge } from '../utils/databaseManager';
import MergePreviewModal from './MergePreviewModal';
import Toast from './Toast';
import { useTransactions } from '../hooks/useTransactions';
import { useSession } from '../hooks/useSession';
import InventoryManager from './InventoryManager';



// ── Main Component ────────────────────────────────────────

export default function TabDatabase() {
  const [subTab, setSubTab] = useState('data');
  const [filterSesi, setFilterSesi] = useState('all');
  const [importData, setImportData] = useState(null);
  const [mergeResult, setMergeResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);

  // ── Read data from hooks (auto-updates via storage listener) ──
  const { allTransactions: transactions } = useTransactions();
  const { allSessions: sessions } = useSession();

  // ── DatabaseStats calculations ────────────────────────────
  const { totalTransaksi, totalSesi, totalPemasukan } = useMemo(() => {
    const tTransaksi = Array.isArray(transactions) ? transactions.length : 0;
    const tSesi = Array.isArray(sessions) ? sessions.length : 0;
    const tPemasukan = Array.isArray(transactions)
      ? transactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0)
      : 0;
    return { totalTransaksi: tTransaksi, totalSesi: tSesi, totalPemasukan: tPemasukan };
  }, [transactions, sessions]);

  // ── Filtered & sorted transactions ───────────────────────
  const sortedTransactions = useMemo(() => {
    return Array.isArray(transactions)
      ? [...transactions].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        })
      : [];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      if (filterSesi === 'all') return true;
      if (filterSesi === 'none') return tx.sessionId === null || tx.sessionId === undefined;
      return tx.sessionId === filterSesi;
    });
  }, [sortedTransactions, filterSesi]);

  // ── Session name lookup ───────────────────────────────────
  const sessionMap = useMemo(() => {
    return Array.isArray(sessions)
      ? Object.fromEntries(sessions.map((s) => [s.id, s.nama || 'Sesi Tanpa Nama']))
      : {};
  }, [sessions]);

  function getSessionName(sessionId) {
    if (!sessionId) return 'Tanpa Sesi';
    return sessionMap[sessionId] || 'Tanpa Sesi';
  }

  // ── Toast helpers ─────────────────────────────────────────
  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function dismissToast() {
    setToast(null);
  }

  // ── Export handler ────────────────────────────────────────
  async function handleExport() {
    try {
      await exportDatabase();
      showToast('Database berhasil diekspor!', 'success');
    } catch {
      showToast('Gagal mengekspor database.', 'error');
    }
  }

  // ── Import handler ────────────────────────────────────────
  function handleImportClick() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const jsonString = event.target.result;
      const result = validateImport(jsonString);

      if (!result.valid) {
        showToast(result.error, 'error');
        return;
      }

      const merge = calculateMerge(result.data);
      setImportData(result.data);
      setMergeResult(merge);
      setIsModalOpen(true);
    };
    reader.readAsText(file);
  }

  // ── Merge confirm handler ─────────────────────────────────
  function handleMergeConfirm() {
    if (!mergeResult) return;
    const result = applyMerge(mergeResult);
    if (result.success) {
      setIsModalOpen(false);
      setImportData(null);
      setMergeResult(null);
      // Removed refreshKey, hooks will auto-update via local-storage-update event
      showToast('Merge berhasil diterapkan!', 'success');
    } else {
      showToast(result.error || 'Merge gagal.', 'error');
    }
  }

  function handleMergeCancel() {
    setIsModalOpen(false);
    setImportData(null);
    setMergeResult(null);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-slide-up">

      {/* Page Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-1">Database</h2>
        <p className="text-sm text-text-muted">
          Kelola data transaksi dan inventaris barang Anda.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border-subtle" role="tablist" aria-label="Sub-tab database">
        <button
          role="tab"
          aria-selected={subTab === 'data'}
          aria-controls="panel-data"
          onClick={() => setSubTab('data')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
            subTab === 'data'
              ? 'bg-primary/15 text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          Manajemen Data
        </button>
        <button
          role="tab"
          aria-selected={subTab === 'inventaris'}
          aria-controls="panel-inventaris"
          onClick={() => setSubTab('inventaris')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
            subTab === 'inventaris'
              ? 'bg-primary/15 text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Master Barang
        </button>
      </div>

      {/* Sub-tab Content */}
      {subTab === 'inventaris' ? (
        <div role="tabpanel" id="panel-inventaris">
          <InventoryManager />
        </div>
      ) : (
      <div role="tabpanel" id="panel-data">

      {/* ── 4.1 DatabaseStats ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Transaksi" value={totalTransaksi} />
        <StatCard label="Total Sesi" value={totalSesi} />
        <StatCard label="Total Pemasukan" value={formatRupiah(totalPemasukan)} />
      </div>

      {/* ── 4.4 & 4.5 Action Buttons ─────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="btn-export-database"
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-text-inverse font-semibold text-sm rounded-xl hover:bg-primary-hover active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,255,163,0.2)] hover:shadow-[0_0_30px_rgba(0,255,163,0.35)] cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Database
        </button>

        <button
          type="button"
          data-testid="btn-import-database"
          onClick={handleImportClick}
          className="flex items-center gap-2 px-5 py-2.5 border border-border-default text-text-secondary font-semibold text-sm rounded-xl hover:text-text-primary hover:bg-white/[0.04] active:scale-[0.97] transition-all duration-200 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import &amp; Merge Database
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      </div>

      {/* ── 4.2 FilterSesi ───────────────────────────────── */}
      <div className="flex items-center gap-3">
        <label htmlFor="filter-sesi-select" className="text-sm font-medium text-text-secondary whitespace-nowrap">
          Filter Sesi:
        </label>
        <select
          id="filter-sesi-select"
          data-testid="filter-sesi-select"
          value={filterSesi}
          onChange={(e) => setFilterSesi(e.target.value)}
          className="bg-bg-surface border border-border-default text-text-primary text-base rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        >
          <option value="all">Semua Sesi</option>
          <option value="none">Tanpa Sesi</option>
          {Array.isArray(sessions) &&
            sessions.map((sesi) => (
              <option key={sesi.id} value={sesi.id}>
                {sesi.nama || 'Sesi Tanpa Nama'} — {sesi.tanggalMulai}
              </option>
            ))}
        </select>
      </div>

      {/* ── 4.3 TabelSemuaTransaksi ──────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table
          className="w-full text-sm"
          data-testid="tabel-semua-transaksi"
        >
          <thead>
            <tr className="bg-bg-surface border-b border-border-default">
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                ID Transaksi
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Tanggal
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Nama Barang
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Kategori
              </th>
              <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Total
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Metode Pembayaran
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Nama Sesi
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-text-muted opacity-40"
                    >
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                    <p>Belum ada transaksi yang tercatat</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx, idx) => (
                <tr
                  key={tx.transactionId || idx}
                  className="border-b border-border-subtle hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3.5 font-mono text-primary text-xs font-medium">
                    {tx.transactionId || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">
                    {formatDate(tx.createdAt || tx.tanggal)}
                  </td>
                  <td className="px-4 py-3.5 text-text-primary">
                    {tx.namaBarang || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">
                    {tx.kategori || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-text-primary tabular-nums">
                    {formatRupiah(tx.total)}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">
                    {tx.metode || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-text-muted text-xs">
                    {getSessionName(tx.sessionId)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      </div>
      )}

      {/* ── MergePreviewModal ─────────────────────────────── */}
      <MergePreviewModal
        isOpen={isModalOpen}
        mergeResult={mergeResult}
        importData={importData}
        onConfirm={handleMergeConfirm}
        onCancel={handleMergeCancel}
      />

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={dismissToast}
        />
      )}
    </div>
  );
}

// ── StatCard sub-component ────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="glass-card p-5 animate-slide-up">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
        {label}
      </p>
      <p className="text-2xl lg:text-3xl font-extrabold text-primary tracking-tight">
        {value}
      </p>
    </div>
  );
}
