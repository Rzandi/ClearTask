/* ═══════════════════════════════════════════════════════════
   TransactionTable — ClearTask
   Paginated table with status badges and action column
   ═══════════════════════════════════════════════════════════ */

import React, { useState, memo, Fragment } from 'react';
import { formatRupiah, formatTime, formatQuantity } from '../utils/formatters';
import EditTransactionModal from './EditTransactionModal';
import ConfirmDialog from './ConfirmDialog';
import EmptyState from './ui/EmptyState';
import StrukModal from './StrukModal';
import { useToast } from '../hooks/useToast';
import HighlightText from './ui/HighlightText';

const ITEMS_PER_PAGE = 10;

function getVisiblePages(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5];
  if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
  return [current - 2, current - 1, current, current + 1, current + 2];
}

export interface TransactionTableProps {
  transactions: any[];
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string, reason?: string) => Promise<void>;
  searchQuery?: string;
}

const TransactionTable = memo(function TransactionTable({
  transactions,
  onUpdate,
  onDelete,
  searchQuery = '',
}: TransactionTableProps) {
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('Salah input kasir');
  const [viewingStruk, setViewingStruk] = useState<any | null>(null);
  const [compactMode, setCompactMode] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / ITEMS_PER_PAGE));
  const safeCurrentPage = totalPages > 0 && currentPage > totalPages ? totalPages : currentPage;

  const startIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const visibleTxs = transactions.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const colSpanCount = compactMode ? 8 : 14;

  return (
    <div className="animate-fade-in">
      {/* Table Toolbar: Mode Toggle (Roadmap 5.C) */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-text-muted">
          {compactMode
            ? 'Mode Ringkas aktif — klik chevron (›) untuk melihat rincian item & modal'
            : 'Mode Detail Lengkap — 13 kolom ditampilkan'}
        </span>
        <button
          type="button"
          onClick={() => setCompactMode((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-default text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          title={compactMode ? 'Tampilkan seluruh 13 kolom' : 'Sederhanakan tampilan kolom'}
          aria-label={compactMode ? 'Beralih ke mode lengkap' : 'Beralih ke mode ringkas'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          {compactMode ? 'Tampilkan 13 Kolom' : 'Mode Ringkas'}
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm" id="transaction-table">
          <thead>
            <tr className="bg-bg-surface border-b border-border-default">
              <th className="w-8 px-2 py-3"></th>
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
              {!compactMode && (
                <>
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
                    Harga Modal (Rp)
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                    Keuntungan (Rp)
                  </th>
                </>
              )}
              <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider">
                Nominal (Rp)
              </th>
              {!compactMode && (
                <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wider hidden lg:table-cell">
                  Catatan
                </th>
              )}
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
                <td colSpan={colSpanCount} className="py-12">
                  <EmptyState
                    icon={
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    }
                    title="Belum ada transaksi"
                    description="Transaksi yang Anda buat akan muncul di sini."
                  />
                </td>
              </tr>
            ) : (
              visibleTxs.map((tx: any, idx: number) => {
                const rowKey = tx.transactionId || String(idx);
                const isExpanded = !!expandedRows[rowKey];
                const hasUnknownModal = tx.items?.some(
                  (i: any) =>
                    (i.hargaModalSnapshot === null || i.hargaModalSnapshot === undefined) &&
                    (i.hargaModal === null || i.hargaModal === undefined)
                );
                const totalModal = tx.items
                  ? tx.items.reduce(
                      (s: number, i: any) =>
                        s +
                        (Number(i.hargaModalSnapshot ?? i.hargaModal) || 0) * (Number(i.qty) || 0),
                      0
                    )
                  : 0;
                const totalProfit = (tx.total || 0) - totalModal;

                return (
                  <Fragment key={rowKey}>
                    <tr className="border-b border-border-subtle hover:bg-white/[0.02] transition-colors">
                      <td className="px-2 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleRowExpand(rowKey)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors cursor-pointer"
                          aria-label={
                            isExpanded
                              ? `Tutup rincian ${tx.transactionId}`
                              : `Buka rincian ${tx.transactionId}`
                          }
                          title={isExpanded ? 'Tutup rincian' : 'Buka rincian'}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-primary' : ''}`}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-primary text-xs font-medium">
                        <HighlightText text={tx.transactionId} query={searchQuery} />
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        {formatTime(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-text-primary max-w-[200px]">
                        {tx.items && tx.items.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium truncate" title={tx.items[0].namaBarang}>
                              <HighlightText text={tx.items[0].namaBarang} query={searchQuery} />
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
                      {!compactMode && (
                        <>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-text-secondary">
                              <MetodeIcon metode={tx.metode} />
                              {tx.metode}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-text-secondary tabular-nums">
                            {formatQuantity(
                              tx.items
                                ? tx.items.reduce(
                                    (s: number, i: any) => s + (Number(i.qty) || 0),
                                    0
                                  )
                                : 0
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-text-secondary text-xs truncate max-w-[100px]">
                            {tx.items && tx.items.length > 0
                              ? tx.items.length > 1
                                ? 'Beragam'
                                : tx.items[0].subKategori || '—'
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-text-secondary tabular-nums">
                            {formatRupiah(totalModal)}
                          </td>
                          <td
                            className={`px-4 py-3.5 text-right font-semibold tabular-nums ${totalProfit >= 0 ? 'text-blue-400' : 'text-accent-red'}`}
                          >
                            {formatRupiah(totalProfit)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3.5 text-right font-semibold text-text-primary tabular-nums">
                        {formatRupiah(tx.total)}
                      </td>
                      {!compactMode && (
                        <td className="px-4 py-3.5 text-text-muted text-xs max-w-[200px] truncate hidden lg:table-cell">
                          {tx.catatan || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Tombol Lihat Struk */}
                          <button
                            type="button"
                            aria-label={`Lihat struk transaksi ${tx.transactionId}`}
                            onClick={() => setViewingStruk(tx)}
                            className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Lihat Struk"
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
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                          </button>
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

                    {/* Expandable Row: Item Breakdown (Roadmap 5.C) */}
                    {isExpanded && (
                      <tr className="bg-bg-elevated/40 border-b border-border-subtle animate-fade-in">
                        <td colSpan={colSpanCount} className="p-4">
                          <div className="bg-bg-surface/90 rounded-xl p-4 border border-border-subtle space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-bold text-primary">
                                  {tx.transactionId}
                                </span>
                                <span className="text-xs text-text-secondary">
                                  {tx.tanggal || formatTime(tx.createdAt)}
                                </span>
                                <span className="text-xs text-text-muted">
                                  Kasir:{' '}
                                  <strong className="text-text-primary">
                                    {tx.kasir || 'Admin'}
                                  </strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted">Metode:</span>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-primary">
                                  <MetodeIcon metode={tx.metode} /> {tx.metode}
                                </span>
                              </div>
                            </div>

                            {/* Item Breakdown Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-text-muted border-b border-border-subtle/50 text-left">
                                    <th className="py-1 px-2 font-medium">Item</th>
                                    <th className="py-1 px-2 font-medium">Sub-Kategori</th>
                                    <th className="py-1 px-2 font-medium text-right">Qty</th>
                                    <th className="py-1 px-2 font-medium text-right">Harga Jual</th>
                                    <th className="py-1 px-2 font-medium text-right">
                                      Harga Modal
                                    </th>
                                    <th className="py-1 px-2 font-medium text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle/30">
                                  {tx.items?.map((item: any, iIdx: number) => (
                                    <tr key={iIdx}>
                                      <td className="py-2 px-2 font-semibold text-text-primary">
                                        <HighlightText text={item.namaBarang} query={searchQuery} />
                                      </td>
                                      <td className="py-2 px-2 text-text-muted">
                                        {item.subKategori || '—'}
                                      </td>
                                      <td className="py-2 px-2 text-right tabular-nums">
                                        {item.qty}
                                      </td>
                                      <td className="py-2 px-2 text-right tabular-nums">
                                        {formatRupiah(item.hargaSatuan)}
                                      </td>
                                      <td className="py-2 px-2 text-right tabular-nums text-text-muted">
                                        {item.hargaModalSnapshot !== null &&
                                        item.hargaModalSnapshot !== undefined
                                          ? formatRupiah(item.hargaModalSnapshot)
                                          : item.hargaModal !== null &&
                                              item.hargaModal !== undefined
                                            ? formatRupiah(item.hargaModal)
                                            : '—'}
                                      </td>
                                      <td className="py-2 px-2 text-right font-bold tabular-nums text-text-primary">
                                        {formatRupiah((item.hargaSatuan || 0) * (item.qty || 1))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border-subtle text-xs">
                              <div className="text-text-muted">
                                Catatan:{' '}
                                <span className="text-text-primary">{tx.catatan || '—'}</span>
                              </div>
                              <div className="flex items-center gap-4 tabular-nums">
                                <span>
                                  Total Modal:{' '}
                                  <strong className="text-text-primary">
                                    {formatRupiah(totalModal)}
                                  </strong>
                                </span>
                                <span>
                                  Keuntungan:{' '}
                                  <strong
                                    className={
                                      totalProfit >= 0 ? 'text-blue-400' : 'text-accent-red'
                                    }
                                  >
                                    {formatRupiah(totalProfit)}
                                  </strong>
                                </span>
                                <span>
                                  Total Transaksi:{' '}
                                  <strong className="text-primary text-sm">
                                    {formatRupiah(tx.total)}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
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
        onSave={async (id: string, data: any) => {
          try {
            await onUpdate(id, data);
            setEditingTransaction(null);
            showToast('Perubahan transaksi berhasil disimpan', 'success');
          } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan perubahan', 'error');
          }
        }}
      />

      <ConfirmDialog
        isOpen={deletingTransactionId !== null}
        title="Konfirmasi Void Transaksi"
        confirmLabel="Void Transaksi"
        message={`Batalkan/Void transaksi ${
          transactions.find((tx: any) => tx.id === deletingTransactionId)?.transactionId || ''
        }? Stok barang akan dikembalikan ke inventaris.`}
        onConfirm={async () => {
          if (!voidReason.trim()) {
            showToast('Alasan void transaksi wajib diisi', 'warning');
            return;
          }
          try {
            await onDelete(deletingTransactionId as string, voidReason.trim());
            setDeletingTransactionId(null);
            setVoidReason('Salah input kasir');
            showToast('Transaksi berhasil dibatalkan (void)', 'success');
          } catch (err: any) {
            showToast(err.message || 'Gagal membatalkan transaksi', 'error');
          }
        }}
        onCancel={() => {
          setDeletingTransactionId(null);
          setVoidReason('Salah input kasir');
        }}
      >
        <div className="mt-3 space-y-1.5 text-left">
          <label className="text-xs text-text-muted font-medium block">
            Alasan Pembatalan / Void (Wajib)*
          </label>
          <select
            value={voidReason.startsWith('Lainnya:') ? 'Lainnya' : voidReason}
            onChange={(e) => {
              if (e.target.value === 'Lainnya') {
                setVoidReason('Lainnya: ');
              } else {
                setVoidReason(e.target.value);
              }
            }}
            className="w-full text-xs px-2.5 py-2 bg-bg-surface border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="Salah input kasir">Salah input kasir</option>
            <option value="Pelanggan batal beli">Pelanggan batal beli</option>
            <option value="Barang rusak / cacat">Barang rusak / cacat</option>
            <option value="Salah metode pembayaran">Salah metode pembayaran</option>
            <option value="Lainnya">Lainnya...</option>
          </select>
          {voidReason.startsWith('Lainnya') && (
            <input
              type="text"
              placeholder="Tulis alasan void..."
              value={voidReason.replace(/^Lainnya:\s*/, '')}
              onChange={(e) => setVoidReason(`Lainnya: ${e.target.value}`)}
              className="w-full text-xs px-2.5 py-2 bg-bg-surface border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-primary mt-1"
              autoFocus
            />
          )}
        </div>
      </ConfirmDialog>

      {/* Struk Preview Modal */}
      {viewingStruk && <StrukModal order={viewingStruk} onClose={() => setViewingStruk(null)} />}
    </div>
  );
});

/* ─── Sub-components ──────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
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

function MetodeIcon({ metode }: { metode: string }) {
  const iconMap = {
    QRIS: '📱',
    Tunai: '💵',
    'Kartu Debit': '💳',
    Transfer: '🏦',
  };
  return (
    <span className="text-sm">
      {Object.hasOwn(iconMap, metode) ? iconMap[metode as keyof typeof iconMap] : '💰'}
    </span>
  );
}

export default TransactionTable;
