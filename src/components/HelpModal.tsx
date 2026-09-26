import { useState, useCallback } from 'react';
import { SHORTCUT_LIST_FOR_UI } from '../constants/shortcuts';
import { useBackHandler } from '../hooks/useBackHandler';

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'panduan' | 'shortcuts'>('panduan');

  const handleBack = useCallback(() => {
    onClose();
  }, [onClose]);

  useBackHandler(isOpen, handleBack);

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
        <div className="px-6 pt-6 pb-3 border-b border-border-default shrink-0 space-y-3">
          <div className="flex items-center justify-between">
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
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Bantuan &amp; Panduan</h2>
                <p className="text-xs text-text-muted">Dokumentasi fitur dan shortcut tombol cepat</p>
              </div>
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

          {/* Sub-Tabs: Panduan Fitur vs Shortcut Keys */}
          <div className="flex gap-1.5 p-1 bg-bg-elevated/70 border border-border-subtle rounded-xl">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'panduan'}
              onClick={() => setActiveTab('panduan')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'panduan'
                  ? 'bg-primary text-text-inverse shadow-sm'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
              }`}
            >
              📖 Panduan &amp; FAQ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'shortcuts'}
              onClick={() => setActiveTab('shortcuts')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'shortcuts'
                  ? 'bg-primary text-text-inverse shadow-sm'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
              }`}
            >
              <span>⌨️ Shortcut Keys</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'shortcuts' ? 'bg-black/20 text-text-inverse' : 'bg-primary/20 text-primary'
              }`}>
                F1 / ?
              </span>
            </button>
          </div>
        </div>
        {/* ↓ SCROLLABLE — semua section masuk sini */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {activeTab === 'panduan' ? (
            <>
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
                  <h3 className="text-sm font-semibold text-text-primary">Transaksi &amp; Kategori</h3>
                </div>
                <div className="pl-9 space-y-1.5">
                  <p className="text-xs text-text-secondary leading-relaxed mb-1">
                    Cara mengelola pencatatan harian Anda:
                  </p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-2 text-xs text-text-secondary">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Input Data:</strong> Isi form di halaman Input Penjualan atau klik produk dari Katalog Cepat. Total akan terhitung otomatis.
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
                        <strong>Edit &amp; Hapus:</strong> Transaksi yang sudah tersimpan dapat diubah atau
                        dihapus melalui tabel Riwayat untuk mencegah salah ketik.
                      </span>
                    </li>
                  </ul>
                </div>
              </section>

              <div className="border-t border-border-subtle" />

              {/* Seksi 1.5: Fitur POS Modern & Retail Kasir */}
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
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">Fitur Cepat Kasir (Retail QOL)</h3>
                </div>
                <div className="pl-9 space-y-2">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Fitur produktivitas kasir untuk mempercepat antrean pelanggan:
                  </p>
                  <ul className="space-y-1.5 text-xs text-text-secondary">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Tombol Uang Pas &amp; Pecahan Tunai:</strong> Di panel pembayaran kasir, klik tombol <span className="text-primary font-medium">"Uang Pas"</span> atau pecahan cepat (Rp 10rb, 20rb, 50rb, 100rb) untuk input kilat tanpa mengetik.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Pecahan Uang Kembalian (Cash Breakdown):</strong> Sistem otomatis menampilkan rekomendasi lembar uang kembalian pecahan Rupiah (contoh: 1x Rp 20.000, 1x Rp 5.000).
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Simpan Antrean (Pending Orders):</strong> Jika ada pelanggan yang ingin mengambil barang tambahan, simpan keranjang sementara dan layani pelanggan berikutnya tanpa kehilangan data transaksi.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Biaya Kantong Plastik:</strong> Opsi toggle kantong plastik (+Rp 500 atau sesuai pengaturan) yang otomatis menambah item dan memperbarui total struk belanja.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Cetak Ulang Struk (Thermal Receipt):</strong> Di tabel riwayat transaksi, klik ikon dokumen struk untuk mencetak ulang tanda terima ke printer kasir 58mm/80mm kapan saja.
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
                        <strong>Filter Cepat Tanggal:</strong> Gunakan preset Hari Ini, Kemarin, 7 Hari Terakhir, atau Mingguan untuk filter instan.
                      </span>
                    </li>
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
                  <h3 className="text-sm font-semibold text-text-primary">Backup &amp; Migrasi Database</h3>
                </div>
                <div className="pl-9 space-y-2">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Karena data tersimpan murni di perangkat Anda (offline-first), gunakan tab{' '}
                    <span className="font-semibold">Database</span> untuk mengamankannya:
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
                    <div>
                      <p className="text-xs font-medium text-text-secondary mb-0.5">
                        Tempat Sampah (Trash Manager):
                      </p>
                      <p className="text-xs text-text-muted">
                        Item transaksi atau inventaris yang tidak sengaja terhapus dapat dipulihkan kembali melalui menu Trash Manager.
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
                        <strong>Tambah Barang:</strong> Daftarkan nama, kategori, sub-kategori, harga modal, harga jual, harga grosir, satuan, dan jumlah stok.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Multi-UOM / Unpack Dus:</strong> Mendukung stok dalam satuan Dus/Karton dengan tombol Unpack kilat untuk mengonversinya ke satuan eceran (Pcs).
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>
                        <strong>Peringatan Stok Rendah:</strong> Barang dengan sisa stok ≤ 5 unit otomatis ditandai dengan label merah agar segera di-restock.
                      </span>
                    </li>
                  </ul>
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
                      Instalasi Aplikasi:
                    </p>
                    <p className="text-xs text-text-muted">
                      Klik tombol <span className="text-primary font-medium">⬇ Install</span> di pojok kanan atas atau gunakan opsi "Add to Home Screen" di browser Anda. Aplikasi dapat dibuka langsung dari layar utama tanpa kuota internet.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1">
                      Pembaruan Otomatis Aman (Safe PWA Update):
                    </p>
                    <p className="text-xs text-text-muted">
                      Jika tersedia versi baru, aplikasi akan menampilkan banner konfirmasi tanpa me-reload paksa saat kasir sedang memproses transaksi.
                    </p>
                  </div>
                </div>
              </section>

              <div className="border-t border-border-subtle" />

              {/* Seksi 7: Privasi */}
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
                  <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                    <p className="text-xs font-semibold text-primary mb-1">
                      🔒 100% Lokal di Perangkat Anda
                    </p>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Semua data tersimpan di IndexedDB browser perangkat Anda tanpa dikirim ke cloud server pihak ketiga. Lakukan export backup secara berkala untuk menjaga keamanan data bisnis Anda.
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* TAB: SHORTCUT KEYS CHEAT SHEET */
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-xs font-semibold text-primary">⚡ Akselerasi Kasir dengan Keyboard</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Gunakan tombol fungsi dan kombinasi shortcut di bawah untuk mengoperasikan kasir tanpa mouse:
                </p>
              </div>

              <div className="space-y-2">
                {SHORTCUT_LIST_FOR_UI.map((sc) => (
                  <div
                    key={sc.display}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-border-subtle hover:border-border-default transition-all"
                  >
                    <div className="pr-3">
                      <p className="text-xs font-medium text-text-primary">{sc.label}</p>
                    </div>
                    <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold text-primary bg-bg-elevated border border-border-default rounded-lg shadow-inner shrink-0">
                      {sc.display}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-bg-elevated border border-border-subtle text-[11px] text-text-muted space-y-1">
                <p className="font-semibold text-text-secondary">💡 Tips Kasir Cepat:</p>
                <p>• Tekan <kbd className="px-1 text-[10px] font-mono text-primary bg-bg-surface border rounded">Ctrl + K</kbd> untuk mencari menu dan aksi kapan saja.</p>
                <p>• Tekan <kbd className="px-1 text-[10px] font-mono text-primary bg-bg-surface border rounded">Ctrl + Enter</kbd> pada keranjang belanja untuk langsung checkout pesanan.</p>
                <p>• Tekan <kbd className="px-1 text-[10px] font-mono text-primary bg-bg-surface border rounded">Alt + O</kbd> jika berjualan di luar ruangan untuk mengaktifkan High Contrast Outdoor Mode.</p>
              </div>
            </div>
          )}
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
