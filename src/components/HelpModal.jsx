/* ═══════════════════════════════════════════════════════════
   HelpModal — ClearTask
   Modal panduan penggunaan aplikasi (FAQ statis)
   ═══════════════════════════════════════════════════════════ */

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    /* Backdrop */
    <div
      data-testid="help-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal card */}
      <div className="glass-card w-full max-w-lg mx-4 animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Panduan Penggunaan</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup panduan"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">

          {/* Seksi 1: Cara Input Transaksi */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Cara Input Transaksi</h3>
            </div>
            <div className="pl-9 space-y-1.5">
              <p className="text-xs text-text-secondary leading-relaxed">
                Isi form berikut untuk mencatat transaksi penjualan:
              </p>
              <ul className="space-y-1">
                {[
                  'Tanggal transaksi',
                  'Kategori Barang',
                  'Nama Barang',
                  'Qty (jumlah)',
                  'Harga Satuan',
                  'Metode Pembayaran',
                  'Catatan (opsional)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-muted pt-1">
                Total dihitung otomatis dari <span className="text-text-secondary">Qty × Harga Satuan</span>. Klik tombol <span className="text-primary font-medium">Simpan</span> untuk menyimpan transaksi.
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* Seksi 2: Cara Export Excel */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Cara Export Excel</h3>
            </div>
            <div className="pl-9 space-y-1">
              {[
                'Buka tab "Riwayat Laporan" di sidebar',
                'Filter tanggal jika diperlukan',
                'Klik tombol "Export Excel" untuk mengunduh file .xlsx',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-primary font-semibold shrink-0 w-4">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* Seksi 3: Cara Install PWA */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Cara Install PWA</h3>
            </div>
            <div className="pl-9 space-y-2">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Chrome (Desktop / Android):</p>
                <p className="text-xs text-text-muted">Klik ikon install di address bar atau pilih dari menu browser.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Safari (iOS):</p>
                <p className="text-xs text-text-muted">Tap tombol <span className="text-text-secondary">Share</span> → pilih <span className="text-text-secondary">"Add to Home Screen"</span>.</p>
              </div>
              <p className="text-xs text-text-muted pt-0.5">
                Setelah install, app bisa dibuka seperti aplikasi native tanpa browser.
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
