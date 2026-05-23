/* ═══════════════════════════════════════════════════════════
   ClosingReportModal — ClearTask
   Modal laporan penutupan sesi dengan statistik transaksi
   Feature: session-management
   ═══════════════════════════════════════════════════════════ */

import { calculateSessionStats } from '../utils/sessionStats';
import { exportSessionExcel } from '../utils/exportExcel';
import { exportSessionCSV } from '../utils/exportCSV';
import { formatRupiah, formatDate, formatTime } from '../utils/formatters';
import { useSettings } from '../contexts/SettingsContext';

/**
 * ClosingReportModal displays session closing statistics and export options
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Object} props.session - The closed session object
 * @param {Array} props.transactions - Transactions in the session
 * @param {Function} props.onClose - Callback when modal is closed
 */
export interface ClosingReportModalProps {
  isOpen: boolean;
  session?: any;
  transactions?: any[];
  onClose: () => void;
}

export default function ClosingReportModal({ isOpen, session, transactions = [], onClose }: ClosingReportModalProps) {
  const { settings } = useSettings();

  // 11.1 Render null jika isOpen adalah false
  if (!isOpen) return null;

  // 11.13 Gunakan calculateSessionStats untuk menghitung statistik
  const stats = calculateSessionStats(session, transactions);

  // 11.2 Tampilkan nama sesi atau "Sesi Tanpa Nama"
  const displayName = session?.nama || 'Sesi Tanpa Nama';

  const hasTransactions = stats.totalTransaksi > 0;

  // 11.9 Handler Export Excel — modal tetap terbuka (11.12)
  function handleExportExcel() {
    exportSessionExcel(transactions, session, settings);
  }

  // 11.10 Handler Export CSV — modal tetap terbuka (11.12)
  function handleExportCSV() {
    exportSessionCSV(transactions, session);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="closing-report-title"
        className="glass-card w-full max-w-lg animate-slide-up flex flex-col max-h-[90vh]"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 id="closing-report-title" className="text-lg font-semibold text-text-primary">Closing Report</h2>
              {/* 11.2 Nama sesi */}
              <p className="text-sm text-primary font-medium">{displayName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup laporan penutupan"
            className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">

          {/* 11.3 Waktu buka dan tutup sesi */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Informasi Sesi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                <p className="text-xs text-text-muted mb-1">Waktu Buka</p>
                <p className="text-sm font-medium text-text-primary">
                  {session?.waktuMulai ? `${formatDate(session.waktuMulai)}, ${formatTime(session.waktuMulai)}` : '-'}
                </p>
              </div>
              <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                <p className="text-xs text-text-muted mb-1">Waktu Tutup</p>
                <p className="text-sm font-medium text-text-primary">
                  {session?.waktuTutup ? `${formatDate(session.waktuTutup)}, ${formatTime(session.waktuTutup)}` : '-'}
                </p>
              </div>
            </div>
          </section>

          {/* 11.4 Total transaksi dan total pemasukan */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Ringkasan</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                <p className="text-xs text-text-muted mb-1">Total Transaksi</p>
                <p className="text-2xl font-bold text-text-primary">{stats.totalTransaksi}</p>
              </div>
              <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                <p className="text-xs text-text-muted mb-1">Total Pemasukan</p>
                <p className="text-xl font-bold text-primary">{formatRupiah(stats.totalPemasukan)}</p>
              </div>
            </div>
          </section>

          {/* 11.8 Pesan jika tidak ada transaksi */}
          {!hasTransactions && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm text-text-muted">Tidak ada transaksi dalam sesi ini</p>
            </div>
          )}

          {/* Breakdown sections — hanya tampil jika ada transaksi */}
          {hasTransactions && (
            <>
              {/* 11.5 Breakdown per kategori */}
              <section>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Breakdown per Kategori</h3>
                <div className="bg-bg-elevated rounded-xl border border-border-subtle overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Kategori</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted">Transaksi</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.breakdownKategori.map((item, idx) => (
                        <tr key={idx} className="border-b border-border-subtle last:border-0">
                          <td className="px-4 py-3 text-text-primary font-medium">{item.kategori}</td>
                          <td className="px-4 py-3 text-right text-text-secondary">{item.jumlahTransaksi}</td>
                          <td className="px-4 py-3 text-right text-text-primary">{formatRupiah(item.totalPemasukan)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 11.6 Breakdown per metode pembayaran */}
              <section>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Breakdown per Metode Pembayaran</h3>
                {stats.breakdownMetode?.length === 1 ? (
                  <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle flex items-center justify-center">
                    <p className="text-sm text-text-secondary font-medium">
                      Semua transaksi via <strong className="text-text-primary">{stats.breakdownMetode[0]?.metode}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="bg-bg-elevated rounded-xl border border-border-subtle overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Metode</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted">Transaksi</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.breakdownMetode?.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-border-subtle last:border-0">
                            <td className="px-4 py-3 text-text-primary font-medium">{item.metode}</td>
                            <td className="px-4 py-3 text-right text-text-secondary">{item.jumlahTransaksi}</td>
                            <td className="px-4 py-3 text-right text-text-primary">{formatRupiah(item.totalPemasukan)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* 11.7 Transaksi tertinggi dan terendah */}
              <section>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Transaksi Ekstrem</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Tertinggi */}
                  <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-primary">↑ Tertinggi</span>
                    </div>
                    {stats.transaksiTertinggi ? (
                      <>
                        <p className="text-sm font-semibold text-text-primary">{formatRupiah(stats.transaksiTertinggi.total)}</p>
                        <p className="text-xs text-text-muted mt-1 truncate">{stats.transaksiTertinggi.namaBarang}</p>
                        <p className="text-xs text-text-muted">{stats.transaksiTertinggi.transactionId}</p>
                      </>
                    ) : (
                      <p className="text-xs text-text-muted">-</p>
                    )}
                  </div>
                  {/* Terendah */}
                  <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-text-secondary">↓ Terendah</span>
                    </div>
                    {stats.transaksiTerendah ? (
                      <>
                        <p className="text-sm font-semibold text-text-primary">{formatRupiah(stats.transaksiTerendah.total)}</p>
                        <p className="text-xs text-text-muted mt-1 truncate">{stats.transaksiTerendah.namaBarang}</p>
                        <p className="text-xs text-text-muted">{stats.transaksiTerendah.transactionId}</p>
                      </>
                    ) : (
                      <p className="text-xs text-text-muted">-</p>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 11.9 Tombol Export Excel */}
              <button
                onClick={handleExportExcel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-bg-elevated border border-border-default text-text-primary hover:border-primary/50 hover:text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
                Export Excel
              </button>

              {/* 11.10 Tombol Export CSV */}
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-bg-elevated border border-border-default text-text-primary hover:border-primary/50 hover:text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
                Export CSV
              </button>
            </div>

            {/* 11.11 Tombol Selesai memanggil onClose */}
            <button
              onClick={onClose}
              className="w-full sm:w-auto sm:ml-auto px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
            >
              Selesai
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
