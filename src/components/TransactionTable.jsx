/* ═══════════════════════════════════════════════════════════
   TransactionTable — ClearTask
   Paginated table with status badges
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { formatRupiah, formatDate, formatTime } from '../utils/formatters';

const ITEMS_PER_PAGE = 10;

export default function TransactionTable({ transactions }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(transactions.length / ITEMS_PER_PAGE));
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleTxs = transactions.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Reset to page 1 when data changes
  if (currentPage > totalPages) setCurrentPage(1);

  return (
    <div className="animate-fade-in">
      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm" id="transaction-table">
          <thead>
            <tr className="bg-bg-surface border-b border-border-default">
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">ID Transaksi</th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">Waktu</th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">Kasir</th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">Metode</th>
              <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">Nominal (Rp)</th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider hidden lg:table-cell">Catatan</th>
              <th className="text-center px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleTxs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6e7681" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <p>Belum ada transaksi</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleTxs.map((tx, idx) => (
                <tr
                  key={tx.transactionId || idx}
                  className="border-b border-border-subtle hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3.5 font-mono text-primary text-xs font-medium">
                    {tx.transactionId}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">
                    {formatTime(tx.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-text-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(tx.kasir || 'A')[0].toUpperCase()}
                    </span>
                    {tx.kasir || 'Admin'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-text-secondary">
                      <MetodeIcon metode={tx.metode} />
                      {tx.metode}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-text-primary tabular-nums">
                    {formatRupiah(tx.total)}
                  </td>
                  <td className="px-4 py-3.5 text-text-muted text-xs max-w-[200px] truncate hidden lg:table-cell">
                    {tx.catatan || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {transactions.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-text-muted">
            Menampilkan {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PAGE, transactions.length)} dari {transactions.length} transaksi
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */
function StatusBadge({ status }) {
  const isSelesai = status === 'Selesai';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
        isSelesai
          ? 'bg-primary/12 text-primary'
          : 'bg-pending/12 text-pending'
      }`}
    >
      {status}
    </span>
  );
}

function MetodeIcon({ metode }) {
  const iconMap = {
    'QRIS': '📱',
    'Tunai': '💵',
    'Kartu Debit': '💳',
    'Transfer': '🏦',
  };
  return <span className="text-sm">{iconMap[metode] || '💰'}</span>;
}
