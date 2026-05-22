/* ═══════════════════════════════════════════════════════════
   TransactionTable — ClearTask
   Paginated table with status badges and action column
   ═══════════════════════════════════════════════════════════ */

import { useState, memo } from 'react';
import { formatRupiah, formatTime, formatQuantity } from '../utils/formatters';
import EditTransactionModal from './EditTransactionModal';
import ConfirmDialog from './ConfirmDialog';

const ITEMS_PER_PAGE = 10;

function getVisiblePages(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5];
  if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
  return [current - 2, current - 1, current, current + 1, current + 2];
}

const TransactionTable = memo(function TransactionTable({ transactions, onUpdate, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(transactions.length / ITEMS_PER_PAGE));
  const safeCurrentPage = totalPages > 0 && currentPage > totalPages ? totalPages : currentPage;

  const startIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const visibleTxs = transactions.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <div className="animate-fade-in">
      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm" id="transaction-table">
          <thead>
            <tr className="bg-bg-surface border-b border-border-default">
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                ID Transaksi
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Waktu
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Barang
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Kasir
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Metode
              </th>
              <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Qty
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Sub-Kategori
              </th>
              <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Nominal (Rp)
              </th>
              <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider hidden lg:table-cell">
                Catatan
              </th>
              <th className="text-center px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Status
              </th>
              {transactions.length > 0 && (
                <th className="text-center px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleTxs.length === 0 ? (
              <tr>
                <td
                  colSpan={transactions.length > 0 ? 11 : 10}
                  className="text-center py-12 text-text-muted"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6e7681"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
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
                  <td className="px-4 py-3.5 text-text-secondary">{formatTime(tx.createdAt)}</td>
                  <td className="px-4 py-3.5 text-text-primary max-w-[200px]">
                    {tx.items && tx.items.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium truncate" title={tx.items[0].namaBarang}>
                          {tx.items[0].namaBarang}
                        </span>
                        {tx.items.length > 1 && (
                          <span className="text-[10px] text-primary bg-primary/10 w-max px-1.5 py-0.5 rounded">
                            +{tx.items.length - 1} item
                          </span>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
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
                  <td className="px-4 py-3.5 text-right font-medium text-text-secondary tabular-nums">
                    {formatQuantity(
                      tx.items ? tx.items.reduce((s, i) => s + (Number(i.qty) || 0), 0) : 0
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary text-xs truncate max-w-[100px]">
                    {tx.items && tx.items.length > 0
                      ? tx.items.length > 1
                        ? 'Beragam'
                        : tx.items[0].subKategori || '—'
                      : '—'}
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
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        aria-label={`Edit transaksi ${tx.transactionId}`}
                        onClick={() => setEditingTransaction(tx)}
                        className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
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
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus transaksi ${tx.transactionId}`}
                        onClick={() => setDeletingTransactionId(tx.id)}
                        className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
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
            Menampilkan {Math.min(startIdx + 1, transactions.length)}-
            {Math.min(startIdx + ITEMS_PER_PAGE, transactions.length)} dari {transactions.length}{' '}
            transaksi
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setCurrentPage((p) => Math.max(1, (p > totalPages ? totalPages : p) - 1))
              }
              disabled={safeCurrentPage === 1}
              className="w-11 h-11 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹
            </button>
            {getVisiblePages(safeCurrentPage, totalPages).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-11 h-11 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  safeCurrentPage === page
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, (p > totalPages ? totalPages : p) + 1))
              }
              disabled={safeCurrentPage === totalPages}
              className="w-11 h-11 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-text-primary hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={editingTransaction !== null}
        onClose={() => setEditingTransaction(null)}
        onSave={async (id, data) => {
          try {
            await onUpdate(id, data);
            setEditingTransaction(null);
          } catch (err) {
            alert(err.message || 'Gagal menyimpan perubahan');
          }
        }}
      />

      <ConfirmDialog
        isOpen={deletingTransactionId !== null}
        message={`Hapus transaksi ${
          transactions.find((tx) => tx.id === deletingTransactionId)?.transactionId
        }?`}
        onConfirm={async () => {
          try {
            await onDelete(deletingTransactionId);
            setDeletingTransactionId(null);
          } catch (err) {
            alert(err.message || 'Gagal menghapus transaksi');
          }
        }}
        onCancel={() => setDeletingTransactionId(null)}
      />
    </div>
  );
});

/* ─── Sub-components ──────────────────────────────────────── */
function StatusBadge({ status }) {
  const isSelesai = status === 'Selesai';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
        isSelesai ? 'bg-primary/12 text-primary' : 'bg-pending/12 text-pending'
      }`}
    >
      {status}
    </span>
  );
}

function MetodeIcon({ metode }) {
  const iconMap = {
    QRIS: '📱',
    Tunai: '💵',
    'Kartu Debit': '💳',
    Transfer: '🏦',
  };
  return <span className="text-sm">{Object.hasOwn(iconMap, metode) ? iconMap[metode] : '💰'}</span>;
}

export default TransactionTable;
