import { useCallback, useMemo } from 'react';
import TransactionTable from './TransactionTable';
import { exportToExcel } from '../utils/exportExcel';
import { toLocalDateString, getTodayISO, formatRupiah } from '../utils/formatters';
import { useSettings } from '../contexts/SettingsContext';
import { useExpenses } from '../hooks/useExpenses';
import ReportingChart from './ReportingChart';

import db from '../services/db';

export interface LaporanExportProps {
  transactions: any[];
  totalCount: number;
  todayMetrics: any;
  filterDate: any;
  setFilterDate: (val: any) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function LaporanExport({
  transactions,
  totalCount,
  todayMetrics,
  filterDate,
  setFilterDate,
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  onUpdate,
  onDelete,
}: LaporanExportProps) {
  const { settings } = useSettings();
  const { expenses } = useExpenses();

  const isFilterActive = !!(filterDate || searchQuery?.trim());
  const hasData = isFilterActive ? transactions.length > 0 : totalCount > 0;

  // Filter expenses matching the selected date ranges
  const filteredExpenses = useMemo(() => {
    let items = [...expenses];
    if (filterDate) {
      if (typeof filterDate === 'string') {
        items = items.filter((e) => e.tanggal === filterDate);
      } else if (filterDate.start && filterDate.end) {
        items = items.filter((e) => e.tanggal >= filterDate.start && e.tanggal <= filterDate.end);
      }
    }
    return items;
  }, [expenses, filterDate]);

  // Aggregate Metrics based on active filters
  const totalRevenue = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  }, [transactions]);

  const totalCostOfSales = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      let cost = 0;
      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach((item: any) => {
          cost += (item.hargaModal || 0) * (item.qty || 1);
        });
      }
      return sum + cost;
    }, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, ex) => sum + (ex.jumlah || 0), 0);
  }, [filteredExpenses]);

  const netProfit = totalRevenue - totalCostOfSales - totalExpense;

  const handleExport = useCallback(async () => {
    if (!hasData) return;
    let dataToExport = transactions;
    if (!isFilterActive) {
      dataToExport = await db.transactions.orderBy('createdAt').reverse().toArray();
    }
    exportToExcel(dataToExport, settings);
  }, [hasData, isFilterActive, transactions, settings]);

  const handleQuickFilter = (type: any) => {
    const today = new Date();
    // Selalu buat Date object baru untuk menghindari mutation bug
    if (type === 'today') {
      const d = getTodayISO();
      setFilterDate({ start: d, end: d, label: 'Hari Ini' });
    } else if (type === 'yesterday') {
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const d = toLocalDateString(yesterday);
      setFilterDate({ start: d, end: d, label: 'Kemarin' });
    } else if (type === 'last7') {
      const start7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      const end = getTodayISO();
      setFilterDate({
        start: toLocalDateString(start7),
        end,
        label: '7 Hari Terakhir',
      });
    } else if (type === 'week') {
      // Senin s/d Minggu minggu berjalan
      const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday);
      const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6);
      setFilterDate({
        start: toLocalDateString(startOfWeek),
        end: toLocalDateString(endOfWeek),
        label: 'Mingguan',
      });
    } else if (type === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFilterDate({
        start: toLocalDateString(start),
        end: toLocalDateString(end),
        label: 'Bulanan',
      });
    } else if (type === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setFilterDate({
        start: toLocalDateString(start),
        end: toLocalDateString(end),
        label: 'Bulan Lalu',
      });
    } else if (type === 'year') {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      setFilterDate({
        start: toLocalDateString(start),
        end: toLocalDateString(end),
        label: 'Tahunan',
      });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Page Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-1">Laporan & Export</h2>
        <p className="text-sm text-text-muted">Tinjau riwayat penjualan dan unduh laporan.</p>
      </div>

      {/* Dynamic Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pemasukan Card */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-text-muted mb-1">Total Pemasukan</p>
          <p className="text-2xl font-bold text-primary">{formatRupiah(totalRevenue)}</p>
          <p className="text-[10px] text-text-muted mt-2">
            {isFilterActive ? 'Sesuai filter' : 'Seluruh waktu'}
          </p>
        </div>

        {/* Keluaran Card */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-text-muted mb-1">Total Keluaran (Pengeluaran)</p>
          <p className="text-2xl font-bold text-accent-red">{formatRupiah(totalExpense)}</p>
          <p className="text-[10px] text-text-muted mt-2">
            {isFilterActive ? 'Sesuai filter' : 'Seluruh waktu'}
          </p>
        </div>

        {/* Profit Card with Margin % */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-text-muted mb-1">Keuntungan Bersih (Profit)</p>
          <div className="flex items-baseline gap-2">
            <p
              className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-accent-red'}`}
            >
              {formatRupiah(netProfit)}
            </p>
            {/* QOL E.2: Profit Margin Percentage */}
            {totalRevenue > 0 && (
              <span
                className={`text-sm font-bold px-1.5 py-0.5 rounded-md ${
                  netProfit >= 0
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {((netProfit / totalRevenue) * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-muted mt-2">
            Margin: Pemasukan - Modal ({formatRupiah(totalCostOfSales)}) - Keluaran
          </p>
        </div>
      </div>

      {/* SVG Reporting Chart */}
      <ReportingChart
        transactions={transactions}
        expenses={filteredExpenses}
        filterType={filterDate?.label || 'Custom'}
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Date Filter */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <input
            type="date"
            id="filter-date"
            value={
              typeof filterDate === 'string'
                ? filterDate
                : filterDate?.start === filterDate?.end
                  ? filterDate.start
                  : ''
            }
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-10 pr-4 py-2.5 text-base bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="filter-search"
            placeholder="Cari ID, Kasir, atau Nama Barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-base bg-bg-input border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-sort" className="text-xs text-text-muted whitespace-nowrap">
            Urutan:
          </label>
          <select
            id="filter-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2.5 text-base bg-bg-input border border-border-default rounded-xl text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none appearance-none cursor-pointer"
          >
            <option value="newest">Waktu (Terbaru)</option>
            <option value="oldest">Waktu (Terlama)</option>
            <option value="highest">Nominal Tertinggi</option>
            <option value="lowest">Nominal Terendah</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(filterDate || searchQuery) && (
          <button
            onClick={() => {
              setFilterDate('');
              setSearchQuery('');
            }}
            className="text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer whitespace-nowrap"
          >
            ✕ Reset filter
          </button>
        )}
      </div>

      {/* Quick Filters — QOL E.1: Enhanced with Kemarin, 7 Hari, Bulan Lalu */}
      <div className="flex flex-wrap gap-2">
        {[
          { type: 'today', label: 'Hari Ini' },
          { type: 'yesterday', label: 'Kemarin' },
          { type: 'last7', label: '7 Hari Terakhir' },
          { type: 'week', label: 'Mingguan' },
          { type: 'month', label: 'Bulanan' },
          { type: 'lastMonth', label: 'Bulan Lalu' },
          { type: 'year', label: 'Tahunan' },
        ].map((btn) => (
          <button
            key={btn.type}
            onClick={() => handleQuickFilter(btn.type)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              filterDate?.label === btn.label
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-elevated'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {isFilterActive && (
        <div className="flex justify-between items-end mb-2">
          <p className="text-sm text-text-muted">
            Menampilkan <strong className="text-text-primary">{transactions.length}</strong> hasil
            filter dari <strong className="text-text-primary">{totalCount}</strong> total transaksi
          </p>
        </div>
      )}
      {/* Transaction Table */}
      <TransactionTable transactions={transactions} onUpdate={onUpdate} onDelete={onDelete} />

      {/* Export Button */}
      <div className="flex justify-center lg:justify-start pt-2">
        <button
          id="btn-export"
          onClick={handleExport}
          disabled={!hasData}
          className="inline-flex items-center gap-2 px-6 py-3 bg-bg-surface border border-border-default rounded-xl text-sm font-semibold text-text-primary hover:bg-bg-elevated hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isFilterActive
            ? `Export Hasil Filter (${transactions.length})`
            : `Export Semua (${totalCount})`}
        </button>
      </div>
    </div>
  );
}
