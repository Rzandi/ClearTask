# Changelog

Semua perubahan penting pada proyek ClearTask akan didokumentasikan dalam file ini.
Format yang digunakan berdasarkan pedoman [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.5.0] - 2026-05-21

Versi 2.5.0 merupakan penyelesaian audit menyeluruh dari `master-saran.md` untuk meningkatkan keamanan data, UX, struktur UI form, optimasi re-render, hingga performa bundel PWA.

### 🎉 Added
- **Content Security Policy (CSP)**: Peningkatan keamanan lapisan depan aplikasi.
- **Batas Karkater (Max Length)**: Pembatasan panjang input (`namaBarang`, `catatan`, dll) mencegah input tidak wajar.
- **Informasi Pagination Dinamis**: Menambahkan label "Menampilkan N dari M transaksi" dan "Terfilter" saat pencarian aktif.

### 🚀 Changed
- **Optimasi React.lazy & Suspense**: Memisahkan komponen berat (`LaporanExport`, `TabDatabase`, `RiwayatSesi`) untuk mempercepat inisialisasi aplikasi.
- **Vite Build Optimization**: Ekstraksi vendor (React/React-DOM) ke `manualChunks` dan menambahkan alias `@/` di Vite.
- **Custom UI Dialog**: Menghapus `window.confirm` dan `window.prompt` yang bersifat memblokir (blocking), diganti dengan `ConfirmDialog` dan `PromptDialog` yang responsif dan selaras dengan tema.
- **Optimasi Local Storage Merge**: Fungsi `applyMerge` kini mengirimkan hasil kalkulasi secara utuh tanpa membaca local storage dua kali (Task #81).

### 🛠️ Fixed
- **Stale Closure di custom Hooks**: Memperbaiki fungsi modifikasi kategori dan manajemen inventori dengan pola *functional updates*.
- **Safe State Updates & Try-Catch Storage**: Menangkap eror penuhnya *local storage* (`QuotaExceededError`) dan memunculkan notifikasi kepada kasir, menghindari kegagalan simpan yang senyap (silent fail).

---

## [2.1.1] - 2026-05-20

### 🎉 Added
- **PWA Auto-Prompt Handle**: Menambahkan *event listener* `beforeinstallprompt` untuk meng-capture PWA instalasi dengan tombol kustom yang responsif. Tombol ini otomatis menghilang apabila aplikasi sudah berhasil diinstall (`appinstalled` event).
- **Offline / Cache Support**: Data tersimpan dengan aman melalui `localStorage` sehingga ClearTask tetap 100% fungsional tanpa koneksi internet.

### 🚀 Changed
- **Aksesibilitas (A11y)**: Mengimplementasi peran ARIA seperti `role="dialog"`, `aria-modal="true"`, `role="tablist"` pada berbagai komponen UI kritis untuk dukungan *Screen Reader* yang lebih baik.

### 🛠️ Fixed
- **ClosingReportModal Overlay**: Memperbaiki bug z-index di mana form modal tertutup oleh *TopBar* dan *BottomNav* saat layar sedang meninjau riwayat sesi. Z-index modal ditingkatkan ke `100`.
- **Property-based tests Timeout**: Memperbaiki false-negative property test yang gagal akibat *test timeout*, dengan simulasi mock untuk `SettingsContext`.
- **CSV BOM Encoding**: Menambahkan UTF-8 BOM pada export file `.csv` sehingga karakter khusus langsung terbaca dengan format yang tepat pada Excel.

---

## [2.1.0] - 2026-05-15

Versi 2.1.0 memperkenalkan **Modul Inventaris (Master Barang)** untuk pengelolaan stok barang yang terintegrasi penuh dengan sistem database ClearTask, serta penyempurnaan komprehensif pada UI mobile dan standar aksesibilitas.

### 🎉 Added
- **Master Barang (Inventaris)**: Modul CRUD lengkap untuk mengelola daftar barang dagangan — meliputi Nama Barang, Kategori, Sub-Kategori, Harga Satuan, Satuan, dan Quantity/Stok.
- **Sub-Tab Database**: Halaman Database kini memiliki dua sub-tab: *Manajemen Data* (backup/restore) dan *Master Barang* (inventaris).
- **Pencarian & Filter Inventaris**: Cari barang berdasarkan nama/kategori dan filter berdasarkan kategori tertentu.
- **Statistik Inventaris Real-time**: Kartu statistik menampilkan Total Jenis Barang, Total Stok, dan Nilai Inventaris secara otomatis.
- **Peringatan Stok Rendah**: Barang dengan stok ≤ 5 unit ditandai dengan warna merah di tabel dan mobile cards.
- **Inventory Backup Integration**: Data inventaris (`cleartask_inventory`) secara otomatis ikut ter-export dan ter-restore dalam fitur Database Manager (JSON).
- **Mobile Session Banner**: Banner *"Buka Sesi"* ditampilkan di tampilan mobile saat belum ada sesi aktif.
- **Mobile FAQ Access**: Tombol Bantuan (FAQ) ditambahkan di *Top Bar* untuk tampilan mobile.
- **Tab "Sesi" di BottomNav**: Tab navigasi bawah mobile kini menyertakan akses langsung ke *Riwayat Sesi*.
- **FAQ Section — Master Barang**: Panduan penggunaan fitur Inventaris telah ditambahkan ke dalam modal Bantuan (FAQ).
- **PWA Install Button**: Tombol install PWA kustom di TopBar yang muncul otomatis saat browser siap menginstall, dan menghilang setelah aplikasi berhasil diinstall.

### 🚀 Changed
- **Responsive Closing Report**: Layout modal *Closing Report* (saat menutup sesi) kini sepenuhnya responsif di layar mobile dengan stacking layout.
- **Aksesibilitas (A11y)**: Warna teks *inactive* di BottomNav ditingkatkan dari `#6e7681` → `#8b949e` (`text-text-secondary`) untuk memenuhi standar WCAG 4.5:1 contrast ratio.
- **BottomNav Icon Colors**: Warna ikon SVG saat *inactive* diperbarui ke `#8b949e` untuk konsistensi kontras visual.
- **Test Suite Updated**: Test HelpModal disesuaikan dengan judul seksi baru, test SessionBanner diupdate untuk banner mobile, dan async property test di exportCSV diperbaiki.
- **PWA Icon Refresh**: Ikon aplikasi (192x192 & 512x512) diperbarui dengan desain baru bertema *Neon Terminal*.

### 🛠️ Fixed
- **InventoryModal Form Reset Bug**: Memperbaiki bug kritis di mana `useEffect` terus-menerus mereset formulir input karena dependency `allCategories` menghasilkan referensi array baru setiap render.
- **Async Property Test**: Memperbaiki unhandled rejection pada property-based test `exportCSV` dengan menambahkan `await` pada `fc.assert(fc.asyncProperty(...))`.
- **Modal Z-Index Clipping**: Semua modal (ClosingReport, InventoryModal, ConfirmDialog) kini di-render via `createPortal` ke `document.body`, mengatasi bug di mana modal terpotong oleh container parent yang memiliki CSS `transform` / `animation`.
- **ClosingReportModal Backdrop**: Menambahkan handler klik backdrop untuk menutup modal saat klik di luar area konten.

---

## [2.0.0] - 2026-05-15

Versi 2.0.0 adalah *major update* yang mengubah status ClearTask dari sekadar prototipe MVP menjadi aplikasi *Point-of-Sales* (POS) dan PWA yang mutakhir, profesional, dan kaya fitur.

### 🎉 Added
- **Session Management (Manajemen Shift)**: Kasir sekarang dapat Membuka dan Menutup Sesi (shift). Setiap transaksi akan dikelompokkan berdasarkan sesi aktif.
- **Riwayat Sesi**: Halaman khusus untuk melihat seluruh riwayat shift yang sudah ditutup beserta metrik rangkuman total pemasukannya.
- **Export Laporan Spesifik Sesi**: Laporan Excel dan CSV kini dapat diekspor secara spesifik per sesi, bukan sekadar riwayat keseluruhan.
- **Database Manager (Import/Export)**: Fitur pengelolaan *Backup* & *Restore* database secara lokal menggunakan format `.json`. Sangat berguna untuk sinkronisasi/migrasi data antar-perangkat.
- **Smart Merge Validation**: Algoritma cerdas pada *Database Manager* yang secara otomatis mencegah duplikasi *ID Transaksi* dan menolak data JSON *corrupt* saat pengguna melakukan *import*.
- **Dynamic Categories**: Kasir kini dapat menambahkan *Kategori* dan *Sub-Kategori* baru secara dinamis langsung dari halaman *Input Penjualan* maupun *Pengaturan*.
- **Manajemen Transaksi (Edit & Delete)**: Mencegah *human-error* dengan menyediakan kapabilitas untuk mengubah atau menghapus transaksi yang sudah tersimpan.
- **Settings & Context**: Personalisasi aplikasi melalui *Modal Pengaturan* untuk Nama Toko dan Nama Kasir (data ini juga otomatis disertakan ke dalam laporan Excel/CSV).
- **Pusat Notifikasi & Pusat Bantuan**: Fitur UI *placeholder* telah diubah menjadi komponen yang sepenuhnya berfungsi untuk melihat aktivitas terbaru dan referensi *FAQ*.

### 🚀 Changed
- **Lighthouse Performance Optimization**: Menggunakan *Dynamic Imports* (`await import()`) untuk *dependency* berat seperti `exceljs` dan `file-saver`. Strategi *lazy-loading* ini sukses mengurangi ukuran bundel awal (*main chunk*) lebih dari 200KB.
- **Aksesibilitas (A11y)**: Penyempurnaan `aria-labels` pada elemen UI interaktif (tombol notifikasi & pengaturan) serta standarisasi rasio kontras visual pada teks prefix mata uang (Rp) untuk keterbacaan tingkat lanjut.
- **Arsitektur Test & Folder**: Pembersihan repositori secara masif dengan memusatkan seluruh 278 test case `vitest` ke dalam direktori terdedikasi `src/__tests__/`.
- **Code Optimization**: Mencegah re-render yang boros di React dengan penambahan mitigasi secara ketat menggunakan `React.memo`, `useMemo`, dan `useCallback`.
- **UI/UX PWA**: Peningkatan ukuran *touch target* minimal `44x44px` dan konsistensi warna *Neon Terminal* agar mematuhi standar *Mobile Responsiveness*.

### 🛠️ Fixed
- **iOS Auto-Zoom Bug**: Menstandarisasi `font-size: 16px` pada `input` dan `select` form untuk melenyapkan perilaku auto-zoom peramban Safari iOS yang mengganggu.
- **Visual Overlap Input**: Memperbaiki tumpang tindih visual antara *prefix* statis "Rp" dan input harga menggunakan custom class `.form-input-prefixed`.
- **Deployment ERESOLVE Error**: Mengeliminasi peringatan konflik *Peer Dependency* React 19 / ESLint v10 ketika melakukan *deployment* di server Vercel via `.npmrc` dengan `legacy-peer-deps`.
- Menghapus 100% *dead-code* (impor dan variabel yang tidak pernah diakses).
