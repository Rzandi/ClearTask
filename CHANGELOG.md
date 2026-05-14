# Changelog

Semua perubahan penting pada proyek ClearTask akan didokumentasikan dalam file ini.
Format yang digunakan berdasarkan pedoman [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
