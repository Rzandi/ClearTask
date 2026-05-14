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

          {/* Seksi 1: Transaksi & Kategori Dinamis */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Transaksi & Kategori</h3>
            </div>
            <div className="pl-9 space-y-1.5">
              <p className="text-xs text-text-secondary leading-relaxed mb-1">
                Cara mengelola pencatatan harian Anda:
              </p>
              <ul className="space-y-1">
                <li className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span><strong>Input Data:</strong> Isi form di halaman Input Penjualan. Total akan terhitung otomatis.</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span><strong>Kategori Baru:</strong> Jika kategori yang diinginkan tidak ada, pilih opsi <span className="text-primary font-medium">"Lainnya..."</span> pada dropdown untuk menambahkannya secara permanen.</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span><strong>Edit & Hapus:</strong> Transaksi yang sudah tersimpan dapat diubah atau dihapus melalui tabel Riwayat untuk mencegah salah ketik.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* Seksi 2: Manajemen Sesi (Shift) */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Manajemen Sesi / Shift</h3>
            </div>
            <div className="pl-9 space-y-2">
              <p className="text-xs text-text-secondary leading-relaxed">
                Fitur ini membantu Anda memisahkan laporan kasir berdasarkan shift harian:
              </p>
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Membuka Sesi:</p>
                  <p className="text-xs text-text-muted">Klik <span className="text-primary font-medium">Buka Sesi</span> di banner atas sebelum mulai menginput transaksi. Masukkan nama shift (contoh: "Shift Pagi - Budi").</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Menutup Sesi:</p>
                  <p className="text-xs text-text-muted">Klik <span className="text-accent-red font-medium">Tutup Sesi</span> saat shift berakhir untuk mencetak laporan performa shift tersebut.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* Seksi 3: Export Laporan */}
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
              <h3 className="text-sm font-semibold text-text-primary">Export Laporan</h3>
            </div>
            <div className="pl-9 space-y-1.5">
              <p className="text-xs text-text-secondary leading-relaxed mb-1">
                Laporan bisa diekspor ke <span className="font-semibold text-text-primary">Excel (.xlsx)</span> atau <span className="font-semibold text-text-primary">CSV</span>.
              </p>
              <ul className="space-y-1 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span><strong>Per Sesi:</strong> Di tab Riwayat Sesi, klik ikon download pada sesi yang sudah ditutup untuk mengekspor khusus transaksi di shift tersebut.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span><strong>Keseluruhan:</strong> Di tab Riwayat Laporan, Anda bisa memfilter tanggal dan mengekspor seluruh transaksi yang tampil.</span>
                </li>
              </ul>
              <p className="text-xs text-text-muted pt-1">
                <span className="font-medium">Tip:</span> Anda dapat mengubah Nama Toko dan Nama Kasir melalui <span className="text-text-secondary">Settings</span> agar ikut tercetak di dalam file Excel.
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* Seksi 4: Database Manager */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Backup & Migrasi Database</h3>
            </div>
            <div className="pl-9 space-y-2">
              <p className="text-xs text-text-secondary leading-relaxed">
                Karena data tersimpan murni di perangkat Anda (offline-first), gunakan tab <span className="font-semibold">Database Manager</span> untuk mengamankannya:
              </p>
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Export JSON (Backup):</p>
                  <p className="text-xs text-text-muted">Unduh seluruh file Database (.json) sebagai backup atau untuk dipindahkan ke HP/Laptop lain.</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Import JSON (Restore):</p>
                  <p className="text-xs text-text-muted">Masukkan file JSON dari perangkat lain. ClearTask dilengkapi <span className="text-primary">Smart Merge</span> yang otomatis menolak duplikasi saat data digabungkan.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* Seksi 5: Cara Install PWA */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Cara Install PWA (Offline)</h3>
            </div>
            <div className="pl-9 space-y-2">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Chrome / Android:</p>
                <p className="text-xs text-text-muted">Klik ikon install di address bar atau pilih <span className="text-text-secondary">"Install App"</span> dari menu browser.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Safari iOS:</p>
                <p className="text-xs text-text-muted">Tap tombol <span className="text-text-secondary">Share</span> di bagian bawah layar → pilih <span className="text-text-secondary">"Add to Home Screen"</span>.</p>
              </div>
              <p className="text-xs text-text-muted pt-0.5 border-l-2 border-primary/30 pl-2 mt-2">
                Aplikasi yang terinstall akan beroperasi secara native dan 100% mendukung mode offline.
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
