/* ═══════════════════════════════════════════════════════════
   LaporanExport — ClearTask
   Report view: Metrics + Filters + Table + Export
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from 'react';
import MetrikCard from './MetrikCard';
import TransactionTable from './TransactionTable';
import { exportToExcel } from '../utils/exportExcel';
import { useSettings } from '../contexts/SettingsContext';

export default function LaporanExport({
  transactions,
  allTransactions,
  todayMetrics,
  filterDate,
  setFilterDate,
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  onUpdate,
  onDelete,
}) {
  const { settings } = useSettings();

  const handleExport = useCallback(() => {
    const dataToExport = transactions.length > 0 ? transactions : allTransactions;
    exportToExcel(dataToExport, settings);
  }, [transactions, allTransactions, settings]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Page Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-1">Laporan & Export</h2>
        <p className="text-sm text-text-muted">Tinjau riwayat penjualan dan unduh laporan.</p>
      </div>

      {/* Metric Card */}
      <MetrikCard
        todayTotal={todayMetrics.todayTotal}
        trendPercent={todayMetrics.trendPercent}
        isFirstDay={todayMetrics.isFirstDay}
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Date Filter */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <input
            type="date"
            id="filter-date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-10 pr-4 py-2.5 text-base bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="filter-search"
            placeholder="Cari ID atau Kasir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-base bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-sort" className="text-xs text-text-muted whitespace-nowrap">Urutan:</label>
          <select
            id="filter-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2.5 text-base bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none appearance-none cursor-pointer"
          >
            <option value="newest">Waktu (Terbaru)</option>
            <option value="oldest">Waktu (Terlama)</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(filterDate || searchQuery) && (
          <button
            onClick={() => { setFilterDate(''); setSearchQuery(''); }}
            className="text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer whitespace-nowrap"
          >
            ✕ Reset filter
          </button>
        )}
      </div>

      {/* Transaction Table */}
      <TransactionTable transactions={transactions} onUpdate={onUpdate} onDelete={onDelete} />

      {/* Export Button */}
      <div className="flex justify-center lg:justify-start pt-2">
        <button
          id="btn-export"
          onClick={handleExport}
          disabled={allTransactions.length === 0}
          className="inline-flex items-center gap-2 px-6 py-3 bg-bg-surface border border-border-default rounded-xl text-sm font-semibold text-text-primary hover:bg-bg-elevated hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export to Excel
        </button>
      </div>
    </div>
  );
}
