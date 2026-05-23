/* ═══════════════════════════════════════════════════════════
   HelpModal — ClearTask
   Modal panduan penggunaan aplikasi (FAQ statis)
   ═══════════════════════════════════════════════════════════ */

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      data-testid="help-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="glass-card w-full max-w-lg mx-4 animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00ffa3"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {/* ↓ SCROLLABLE — semua section masuk sini */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Seksi 1 */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                  <span>
                    <strong>Input Data:</strong> Isi form di halaman Input Penjualan. Total akan
                    terhitung otomatis.
                  </span>
                </li>
                <li className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Kategori Baru:</strong> Jika kategori yang diinginkan tidak ada, pilih
                    opsi <span className="text-primary font-medium">"Lainnya..."</span> pada
                    dropdown untuk menambahkannya secara permanen.
                  </span>
                </li>
                <li className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Edit & Hapus:</strong> Transaksi yang sudah tersimpan dapat diubah atau
                    dihapus melalui tabel Riwayat untuk mencegah salah ketik.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <div className="border-t border-border-subtle" />

          {/* Seksi 2 */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                  <p className="text-xs text-text-muted">
                    Klik <span className="text-primary font-medium">Buka Sesi</span> di banner atas
                    sebelum mulai menginput transaksi. Masukkan nama shift (contoh: "Shift Pagi -
                    Budi").
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Menutup Sesi:</p>
                  <p className="text-xs text-text-muted">
                    Klik <span className="text-accent-red font-medium">Tutup Sesi</span> saat shift
                    berakhir untuk mencetak laporan performa shift tersebut.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-border-subtle" />

          {/* Seksi 3 */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                Laporan bisa diekspor ke{' '}
                <span className="font-semibold text-text-primary">Excel (.xlsx)</span> atau{' '}
                <span className="font-semibold text-text-primary">CSV</span>.
              </p>
              <ul className="space-y-1 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Per Sesi:</strong> Di tab Riwayat Sesi, klik ikon download pada sesi
                    yang sudah ditutup untuk mengekspor khusus transaksi di shift tersebut.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Keseluruhan:</strong> Di tab Riwayat Laporan, Anda bisa memfilter
                    tanggal dan mengekspor seluruh transaksi yang tampil.
                  </span>
                </li>
              </ul>
              <p className="text-xs text-text-muted pt-1">
                <span className="font-medium">Tip:</span> Anda dapat mengubah Nama Toko dan Nama
                Kasir melalui <span className="text-text-secondary">Settings</span> agar ikut
                tercetak di dalam file Excel.
              </p>
            </div>
          </section>

          <div className="border-t border-border-subtle" />

          {/* Seksi 4 */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Backup & Migrasi Database</h3>
            </div>
            <div className="pl-9 space-y-2">
              <p className="text-xs text-text-secondary leading-relaxed">
                Karena data tersimpan murni di perangkat Anda (offline-first), gunakan tab{' '}
                <span className="font-semibold">Database Manager</span> untuk mengamankannya:
              </p>
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-0.5">
                    Export JSON (Backup):
                  </p>
                  <p className="text-xs text-text-muted">
                    Unduh seluruh file Database (.json) sebagai backup atau untuk dipindahkan ke
                    HP/Laptop lain.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-0.5">
                    Import JSON (Restore):
                  </p>
                  <p className="text-xs text-text-muted">
                    Masukkan file JSON dari perangkat lain. ClearTask dilengkapi{' '}
                    <span className="text-primary">Smart Merge</span> yang otomatis menolak
                    duplikasi saat data digabungkan.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-border-subtle" />

          {/* Seksi 5 */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                Master Barang (Inventaris)
              </h3>
            </div>
            <div className="pl-9 space-y-2">
              <p className="text-xs text-text-secondary leading-relaxed">
                Kelola daftar barang dagangan Anda secara terpisah melalui tab{' '}
                <span className="font-semibold">Master Barang</span> di halaman Database:
              </p>
              <ul className="space-y-1 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Tambah Barang:</strong> Daftarkan nama, kategori, sub-kategori, harga
                    satuan, satuan, dan jumlah stok barang Anda.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Edit & Hapus:</strong> Perbarui informasi harga atau stok kapan saja
                    melalui tombol aksi di setiap baris barang.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Cari & Filter:</strong> Gunakan pencarian nama atau filter kategori
                    untuk menemukan barang dengan cepat.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Backup Otomatis:</strong> Data inventaris ikut ter-backup saat Anda
                    melakukan <span className="text-primary">Export Database</span> dan ikut
                    ter-restore saat Import.
                  </span>
                </li>
              </ul>
              <p className="text-xs text-text-muted pt-0.5 border-l-2 border-primary/30 pl-2 mt-2">
                Stok yang tersisa ≤ 5 unit akan ditandai dengan warna merah sebagai peringatan stok
                rendah.
              </p>
            </div>
          </section>

          <div className="border-t border-border-subtle" />

          {/* Seksi 6: PWA */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                Cara Install PWA (Offline)
              </h3>
            </div>
            <div className="pl-9 space-y-2">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">
                  Tombol Install Otomatis:
                </p>
                <p className="text-xs text-text-muted">
                  Jika browser Anda mendukung instalasi, tombol{' '}
                  <span className="text-primary font-medium">⬇ Install</span> akan muncul otomatis
                  di pojok kanan atas. Klik untuk menginstall ClearTask ke perangkat Anda. Tombol
                  akan hilang setelah berhasil terinstall.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Chrome / Android:</p>
                <p className="text-xs text-text-muted">
                  Klik ikon install di address bar atau pilih{' '}
                  <span className="text-text-secondary">"Install App"</span> dari menu browser.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Safari iOS:</p>
                <p className="text-xs text-text-muted">
                  Tap tombol <span className="text-text-secondary">Share</span> di bagian bawah
                  layar → pilih <span className="text-text-secondary">"Add to Home Screen"</span>.
                </p>
              </div>
              <p className="text-xs text-text-muted pt-0.5 border-l-2 border-primary/30 pl-2 mt-2">
                Aplikasi yang terinstall akan beroperasi secara native dan 100% mendukung mode
                offline.
              </p>
            </div>
          </section>

          <div className="border-t border-border-subtle" />

          {/* Seksi 7: Pengaturan */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                Pengaturan &amp; Kustomisasi
              </h3>
            </div>
            <div className="pl-9 space-y-1.5">
              <p className="text-xs text-text-secondary leading-relaxed mb-1">
                Buka ikon <span className="text-primary font-medium">⚙ Settings</span> di pojok
                kanan atas untuk mengatur preferensi aplikasi:
              </p>
              <ul className="space-y-1 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Nama Toko &amp; Kasir:</strong> Nama ini akan otomatis tercetak di
                    header file Excel dan CSV yang diekspor.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Tema Tampilan:</strong> Pilih tema warna sesuai preferensi Anda.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Kelola Kategori:</strong> Tambah atau hapus kategori dan sub-kategori
                    default langsung dari halaman Pengaturan tanpa harus membuka form transaksi.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>
                    <strong>Backup Pengingat:</strong> Pengaturan menyertakan pengingat untuk
                    melakukan backup rutin agar data tidak hilang.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <div className="border-t border-border-subtle" />

          {/* Seksi 8: Privasi — MASUK DI SINI, dalam scrollable */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00ffa3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                Privasi &amp; Keamanan Data
              </h3>
            </div>
            <div className="pl-9 space-y-3">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Data yang Disimpan</p>
                <ul className="space-y-1 text-xs text-text-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>
                      <strong className="text-text-secondary">Transaksi penjualan</strong> — nama
                      barang, qty, harga, metode, catatan
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>
                      <strong className="text-text-secondary">Sesi kasir</strong> — waktu
                      buka/tutup, nama shift
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>
                      <strong className="text-text-secondary">Inventaris &amp; kategori</strong> —
                      master data barang dagangan
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>
                      <strong className="text-text-secondary">Pengaturan</strong> — nama kasir, nama
                      toko, tema tampilan
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                <p className="text-xs font-semibold text-primary mb-1">
                  🔒 100% Lokal di Perangkat Anda
                </p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Semua data disimpan di{' '}
                  <strong className="text-text-secondary">IndexedDB browser</strong> perangkat Anda
                  — tidak pernah dikirim ke server manapun. ClearTask tidak memiliki backend, tidak
                  ada akun, dan tidak ada koneksi internet yang diperlukan.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Hak Hapus Data</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Anda dapat menghapus seluruh data kapan saja melalui menu{' '}
                  <strong className="text-text-secondary">Database Manager</strong> atau dengan
                  menghapus data browser secara manual. Penghapusan bersifat permanen dan tidak
                  dapat dipulihkan.
                </p>
              </div>
              <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
                <p className="text-xs font-semibold text-warning mb-1">⚠️ Penting: Backup Rutin</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Karena data tersimpan lokal, data bisa hilang jika browser di-reset atau perangkat
                  rusak. Lakukan backup rutin via{' '}
                  <strong className="text-text-secondary">Database Manager → Export JSON</strong>.
                </p>
              </div>
            </div>
          </section>
        </div>{' '}
        {/* ← TUTUP scrollable di sini */}
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
