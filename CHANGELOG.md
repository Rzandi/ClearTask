# Changelog

Semua perubahan penting pada proyek ClearTask akan didokumentasikan dalam file ini.
Format yang digunakan berdasarkan pedoman [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.1.0] - 2026-05-25

Versi 3.1.0 fokus pada optimasi skalabilitas, keandalan sistem tingkat tinggi (System Hardening), dan performa tingkat lanjut (Advanced Performance Architecture) agar aplikasi tetap responsif dan aman meskipun data transaksi bertambah seiring usia operasional toko.

### 🚀 Changed & Optimized (Performance & Scalability)

- **Web Worker SAW Restocking**: Memindahkan komputasi berat algoritma multi-kriteria _Simple Additive Weighting_ (SAW) dari _main thread_ ke background worker thread (`sawWorker.ts`). Proses evaluasi prioritas stok ulang kini berjalan sepenuhnya paralel, menjaga fluiditas rendering UI visual kasir tetap stabil di angka 60 FPS tanpa dropped frames.
- **Tutup Buku & Arsip Transaksi Tahunan**: Menambahkan fitur pemindahan transaksi lawas yang berumur lebih dari 1 tahun secara atomik dari tabel utama `transactions` ke tabel `archive_transactions` yang terpartisi secara terpisah. Langkah ini mempercepat kueri harian secara drastis tanpa menghapus data historis toko.
- **Session Pagination**: Mengimplementasikan sistem _pagination_ (maksimal 20 sesi per halaman) pada komponen Riwayat Sesi untuk mencegah degradasi kinerja visual seiring bertambahnya ribuan log sesi penutupan shift.

### 🛡️ Added & Fixed (Reliability & Hardening)

- **Timezone Lock WIB Midnight Standard**: Mengunci standardisasi perekaman tanggal transaksi menggunakan helper lokal `getTodayISO()` yang disesuaikan ke batas kalender WIB (Waktu Indonesia Barat) tepat pada pukul 00:00 tengah malam. Langkah ini melenyapkan bug pergeseran tanggal/pelaporan yang melompat akibat perbedaan zona waktu browser/UTC.
- **Penanganan QuotaExceededError (Offline Storage Hardening)**: Menambahkan deteksi dini kapasitas memori penyimpanan lokal IndexedDB browser. Sistem secara anggun menangkap error `QuotaExceededError` jika perangkat kehabisan kuota penyimpanan offline, lalu menembakkan Toast notifikasi berwarna merah yang menyarankan kasir melakukan backup ekspor dan pengarsipan untuk mencegah kegagalan simpan penjualan yang senyap (_silent save fail_).
- **Smart Double-Merge Import Validation Check**: Memperkeras modul impor database (`databaseManager.ts`) menggunakan Set boundaries double-check untuk menyaring transaksi ganda secara otomatis dan atomik, baik dari database IndexedDB lokal maupun di dalam file backup JSON itu sendiri sebelum data digabungkan.

---

## [3.0.0] - 2026-05-24

Versi 3.0.0 menandai perombakan pondasi arsitektur ClearTask menuju fase _Enterprise-Ready_. Semua kode inti secara bertahap dimigrasikan ke TypeScript untuk keamanan tipe data (Type Safety), dan antrean Cloud Sync disiapkan sebagai pondasi sinkronisasi data antar perangkat.

### 🏗️ Changed

- **TypeScript Migration (100% Core, Hooks, & UI)**: Mengubah seluruh utilitas (`src/utils/`), _services_ database (`src/services/`), _custom hooks_ Dexie (`src/hooks/`), dan seluruh komponen React (`src/components/`, `src/contexts/`, `App`, `main`) dari JavaScript murni menjadi TypeScript (`.ts` / `.tsx`). Ini memastikan _autocompletion_ dan ketatnya pengecekan tipe properti dengan nol _loose types_.
- **Testing Suite**: Penyesuaian _mock data_ dan _asynchronous behavior_ pada 281 _property-based tests_ dan _unit tests_ di Vitest untuk memastikan kehandalan penuh tanpa peringatan kompilasi (`tsc --noEmit` bersih).

### 🎉 Added

- **Cloud Sync Blueprint**: Menambahkan `syncManager.ts` yang berisi arsitektur antrean data secara lokal (_offline-first_) dan algoritma LWW (Last-Write-Wins) untuk resolusi konflik sinkronisasi (bersiap integrasi Firebase/Supabase).
- **Audit Trail**: Menambahkan fungsi pencatatan _timestamp_ modifikasi (`updatedAt`) dan kasir yang merubah (`updatedBy`) pada tabel transaksi dan inventaris.

---

## [2.9.5] - 2026-05-23

Versi 2.9.5 adalah rilis pemeliharaan (maintenance) yang difokuskan pada mode "Bug Hunter" dan pembersihan codebase secara menyeluruh. Menyelesaikan 33 isu linting (ESLint) untuk memastikan aplikasi lebih stabil, bersih, dan sepenuhnya mematuhi standar React Fast Refresh. Selain itu, pembaruan ini membawa perbaikan bug kritis pada database IndexedDB dan peningkatan UI/UX signifikan pada antarmuka kasir.

### 🎉 Added

- **Katalog Barang**: Menambahkan bar pencarian, filter Kategori & Sub-Kategori, serta tombol _Sort_ (A-Z, Harga) interaktif secara horizontal.
- **Katalog Barang (Quick Edit)**: Menambahkan tombol `+` dan `-` pada kartu barang untuk mengatur stok secara langsung (instan) tanpa perlu berpindah ke tab Master Barang.
- **Laporan & Export**: Menambahkan tombol filter rentang waktu cepat (_Shortcut_): "Hari Ini", "Mingguan", dan "Bulanan" untuk mempermudah ekspor data spesifik.

### 🚀 Changed

- **UI/UX Input Penjualan**: Meningkatkan respon taktil kartu barang (_active scale_, _shadow glow_), serta otomatis memblokir (_disable_) klik jika stok barang mencapai 0.
- **UI/UX TopBar Mobile**: Menyesuaikan jarak (_gap_) dan ukuran ikon pada layar HP untuk menghindari masalah ikon terpotong (_overflow_) atau terlalu mepet ke ujung layar.

### 🛠️ Fixed

- **Dexie ConstraintError**: Memperbaiki masalah duplikasi _Key_ pada IndexedDB (`db.meta.put`) yang menyebabkan aplikasi _crash_ (layar merah) saat membuat ID Transaksi secara cepat atau saat melakukan sinkronisasi _backup_.
- **Riwayat Sesi Error**: Memperbaiki layar putih (_crash_) saat menekan laporan sesi yang sudah ditutup. Proses penarikan data transaksi kini menggunakan _asynchronous Promise_ (`await`) yang tepat.
- **Tombol Tambah Keranjang**: Memperbaiki tipe _button variant_ yang salah (`secondary`) sehingga tombol "Tambah ke Keranjang" pada tab Input Manual kini dirender dengan sempurna (`outline`).

**Codebase & Fast Refresh**

- `PinLockScreen.jsx`: Menghapus pemanggilan fungsi _impure_ `Date.now()` di dalam siklus render, menggantinya dengan evaluasi state `lockCountdown`.
- `SettingsContext.jsx`: Memisahkan konstanta (`defaultSettings`, `VALID_ACCENT_COLORS`) dan helper `applyThemeToDOM` ke `src/config/settingsConfig.js` untuk mematuhi aturan Vite Fast Refresh.
- `SettingsContext.jsx`: Memperbaiki peringatan `react-hooks/exhaustive-deps` dengan mendestrukturisasi `theme` dan `accentColor` di luar dependensi efek.
- `Badge.jsx`: Mengekstraksi fungsi `statusVariant` ke `src/utils/statusVariant.js` agar komponen terisolasi dengan baik.
- `SecurityContext.jsx`: Menambahkan inline suppression untuk hook agar sesuai dengan arsitektur ekspor _context_.

**Testing & Configs**

- `eslint.config.js`: Menambahkan `globals.node` dan environment Vitest untuk memperbaiki _false-positive_ error `process is not defined` dan `require is not defined`.
- `Test Suite`: Pembersihan menyeluruh variabel tidak terpakai (`unused vars`), pengembalian impor yang hilang (`cleanup`, `fireEvent`), serta perbaikan _invalid regex escaping_ (`\@`) pada 10+ file pengujian.

---

## [2.9.0] - 2026-05-23

Versi 2.9.0 adalah rilis penutup siklus audit menyeluruh yang mencakup perbaikan 21 bug lintas sektor, refactor arsitektur hooks, hardening database transactions, pembersihan repositori, dan pembaruan dokumentasi lengkap.

### 🛠️ Fixed

**Concurrency & Database Integrity**

- `useTransactionData.js`: Penomoran ID transaksi kini dibungkus dalam `db.transaction('rw', ...)` untuk mencegah race condition saat input cepat berurutan
- `useSession.js`: `openSession` dibungkus dalam Dexie transaction untuk atomicity penuh
- `migration.js`: Ditambahkan pengecekan `isMigratedInDB()` sebelum migrasi dijalankan ulang; skip clear jika tidak ada data localStorage

**Hooks & State**

- `useCategories.js`: Semua mutasi (tambah/hapus kategori & sub-kategori) kini membaca state segar dari DB, menghilangkan stale closure bug
- `useTransactionMetrics.js`: `isFirstDay` kini menekan trend ketika `todayTotal === 0` untuk menghindari false positive

**UI & Form**

- `InputPenjualan.jsx`: `handleKategoriConfirm` dan `handleSubKategoriConfirm` diubah ke `async/await`
- `TransactionTable.jsx`: `colSpan` diperbaiki ke nilai dinamis (`11` saat ada data, `10` saat kosong); handler `onUpdate`/`onDelete` diubah ke `async/await`
- `EditTransactionModal.jsx`: `handleChange` kini membersihkan error field saat pengguna mengetik; dihapus double overlay `onClick={onClose}` yang menyebabkan modal tertutup saat klik konten
- `useInventory.js`: Komentar yang salah tentang `++id` vs `&id` diperbaiki

**Export & Merge**

- `exportExcel.js`: `sessionName` kini disanitasi dengan regex untuk nama file yang aman; `tanggalTutup` digunakan langsung tanpa konversi ganda
- `databaseManager.js`: `applyMerge` kini menggunakan flag `__isMergeResult` sebagai penanda hasil merge, menggantikan duck-typing yang rawan false positive

**Komentar & Dokumentasi Kode**

- `TabDatabase.jsx`: Komentar stale "localStorage" diperbarui menjadi "Dexie"

### 🏗️ Changed

- **Arsitektur Hooks**: `useTransactions.js` dipecah menjadi tiga sub-hook terpisah — `useTransactionData`, `useTransactionFilter`, `useTransactionMetrics` — untuk separation of concerns yang lebih bersih
- **Lokasi `databaseManager.js`**: Dipindahkan dari `src/utils/` ke `src/services/` agar sesuai dengan klasifikasi layer arsitektur
- **Provider Tree**: `SecurityProvider` dan `SecurityGate` dihapus dari provider nesting (PIN system direncanakan ulang di versi mendatang)

### 🧹 Chores

- **Repositori dibersihkan**: Dihapus `answers.txt` (berisi password keystore), `auto-bubblewrap.mjs` (hardcoded credentials), `refactor.cjs` (one-time script), `test_report.json` (generated output)
- **`.gitignore` diperbarui**: Ditambahkan `android-build/` (keystore + APK + AAB), `coverage/`, `test_report.json`, `.env`, `.env.local`
- **Test suite**: 34 passed, 0 failed, 2 skipped — semua test disesuaikan dengan perubahan async handlers dan path `databaseManager`

---

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

- **Stale Closure di custom Hooks**: Memperbaiki fungsi modifikasi kategori dan manajemen inventori dengan pola _functional updates_.
- **Safe State Updates & Try-Catch Storage**: Menangkap eror penuhnya _local storage_ (`QuotaExceededError`) dan memunculkan notifikasi kepada kasir, menghindari kegagalan simpan yang senyap (silent fail).

---

## [2.1.1] - 2026-05-20

### 🎉 Added

- **PWA Auto-Prompt Handle**: Menambahkan _event listener_ `beforeinstallprompt` untuk meng-capture PWA instalasi dengan tombol kustom yang responsif. Tombol ini otomatis menghilang apabila aplikasi sudah berhasil diinstall (`appinstalled` event).
- **Offline / Cache Support**: Data tersimpan dengan aman melalui `localStorage` sehingga ClearTask tetap 100% fungsional tanpa koneksi internet.

### 🚀 Changed

- **Aksesibilitas (A11y)**: Mengimplementasi peran ARIA seperti `role="dialog"`, `aria-modal="true"`, `role="tablist"` pada berbagai komponen UI kritis untuk dukungan _Screen Reader_ yang lebih baik.

### 🛠️ Fixed

- **ClosingReportModal Overlay**: Memperbaiki bug z-index di mana form modal tertutup oleh _TopBar_ dan _BottomNav_ saat layar sedang meninjau riwayat sesi. Z-index modal ditingkatkan ke `100`.
- **Property-based tests Timeout**: Memperbaiki false-negative property test yang gagal akibat _test timeout_, dengan simulasi mock untuk `SettingsContext`.
- **CSV BOM Encoding**: Menambahkan UTF-8 BOM pada export file `.csv` sehingga karakter khusus langsung terbaca dengan format yang tepat pada Excel.

---

## [2.1.0] - 2026-05-15

Versi 2.1.0 memperkenalkan **Modul Inventaris (Master Barang)** untuk pengelolaan stok barang yang terintegrasi penuh dengan sistem database ClearTask, serta penyempurnaan komprehensif pada UI mobile dan standar aksesibilitas.

### 🎉 Added

- **Master Barang (Inventaris)**: Modul CRUD lengkap untuk mengelola daftar barang dagangan — meliputi Nama Barang, Kategori, Sub-Kategori, Harga Satuan, Satuan, dan Quantity/Stok.
- **Sub-Tab Database**: Halaman Database kini memiliki dua sub-tab: _Manajemen Data_ (backup/restore) dan _Master Barang_ (inventaris).
- **Pencarian & Filter Inventaris**: Cari barang berdasarkan nama/kategori dan filter berdasarkan kategori tertentu.
- **Statistik Inventaris Real-time**: Kartu statistik menampilkan Total Jenis Barang, Total Stok, dan Nilai Inventaris secara otomatis.
- **Peringatan Stok Rendah**: Barang dengan stok ≤ 5 unit ditandai dengan warna merah di tabel dan mobile cards.
- **Inventory Backup Integration**: Data inventaris (`cleartask_inventory`) secara otomatis ikut ter-export dan ter-restore dalam fitur Database Manager (JSON).
- **Mobile Session Banner**: Banner _"Buka Sesi"_ ditampilkan di tampilan mobile saat belum ada sesi aktif.
- **Mobile FAQ Access**: Tombol Bantuan (FAQ) ditambahkan di _Top Bar_ untuk tampilan mobile.
- **Tab "Sesi" di BottomNav**: Tab navigasi bawah mobile kini menyertakan akses langsung ke _Riwayat Sesi_.
- **FAQ Section — Master Barang**: Panduan penggunaan fitur Inventaris telah ditambahkan ke dalam modal Bantuan (FAQ).
- **PWA Install Button**: Tombol install PWA kustom di TopBar yang muncul otomatis saat browser siap menginstall, dan menghilang setelah aplikasi berhasil diinstall.

### 🚀 Changed

- **Responsive Closing Report**: Layout modal _Closing Report_ (saat menutup sesi) kini sepenuhnya responsif di layar mobile dengan stacking layout.
- **Aksesibilitas (A11y)**: Warna teks _inactive_ di BottomNav ditingkatkan dari `#6e7681` → `#8b949e` (`text-text-secondary`) untuk memenuhi standar WCAG 4.5:1 contrast ratio.
- **BottomNav Icon Colors**: Warna ikon SVG saat _inactive_ diperbarui ke `#8b949e` untuk konsistensi kontras visual.
- **Test Suite Updated**: Test HelpModal disesuaikan dengan judul seksi baru, test SessionBanner diupdate untuk banner mobile, dan async property test di exportCSV diperbaiki.
- **PWA Icon Refresh**: Ikon aplikasi (192x192 & 512x512) diperbarui dengan desain baru bertema _Neon Terminal_.

### 🛠️ Fixed

- **InventoryModal Form Reset Bug**: Memperbaiki bug kritis di mana `useEffect` terus-menerus mereset formulir input karena dependency `allCategories` menghasilkan referensi array baru setiap render.
- **Async Property Test**: Memperbaiki unhandled rejection pada property-based test `exportCSV` dengan menambahkan `await` pada `fc.assert(fc.asyncProperty(...))`.
- **Modal Z-Index Clipping**: Semua modal (ClosingReport, InventoryModal, ConfirmDialog) kini di-render via `createPortal` ke `document.body`, mengatasi bug di mana modal terpotong oleh container parent yang memiliki CSS `transform` / `animation`.
- **ClosingReportModal Backdrop**: Menambahkan handler klik backdrop untuk menutup modal saat klik di luar area konten.

---

## [2.0.0] - 2026-05-15

Versi 2.0.0 adalah _major update_ yang mengubah status ClearTask dari sekadar prototipe MVP menjadi aplikasi _Point-of-Sales_ (POS) dan PWA yang mutakhir, profesional, dan kaya fitur.

### 🎉 Added

- **Session Management (Manajemen Shift)**: Kasir sekarang dapat Membuka dan Menutup Sesi (shift). Setiap transaksi akan dikelompokkan berdasarkan sesi aktif.
- **Riwayat Sesi**: Halaman khusus untuk melihat seluruh riwayat shift yang sudah ditutup beserta metrik rangkuman total pemasukannya.
- **Export Laporan Spesifik Sesi**: Laporan Excel dan CSV kini dapat diekspor secara spesifik per sesi, bukan sekadar riwayat keseluruhan.
- **Database Manager (Import/Export)**: Fitur pengelolaan _Backup_ & _Restore_ database secara lokal menggunakan format `.json`. Sangat berguna untuk sinkronisasi/migrasi data antar-perangkat.
- **Smart Merge Validation**: Algoritma cerdas pada _Database Manager_ yang secara otomatis mencegah duplikasi _ID Transaksi_ dan menolak data JSON _corrupt_ saat pengguna melakukan _import_.
- **Dynamic Categories**: Kasir kini dapat menambahkan _Kategori_ dan _Sub-Kategori_ baru secara dinamis langsung dari halaman _Input Penjualan_ maupun _Pengaturan_.
- **Manajemen Transaksi (Edit & Delete)**: Mencegah _human-error_ dengan menyediakan kapabilitas untuk mengubah atau menghapus transaksi yang sudah tersimpan.
- **Settings & Context**: Personalisasi aplikasi melalui _Modal Pengaturan_ untuk Nama Toko dan Nama Kasir (data ini juga otomatis disertakan ke dalam laporan Excel/CSV).
- **Pusat Notifikasi & Pusat Bantuan**: Fitur UI _placeholder_ telah diubah menjadi komponen yang sepenuhnya berfungsi untuk melihat aktivitas terbaru dan referensi _FAQ_.

### 🚀 Changed

- **Lighthouse Performance Optimization**: Menggunakan _Dynamic Imports_ (`await import()`) untuk _dependency_ berat seperti `exceljs` dan `file-saver`. Strategi _lazy-loading_ ini sukses mengurangi ukuran bundel awal (_main chunk_) lebih dari 200KB.
- **Aksesibilitas (A11y)**: Penyempurnaan `aria-labels` pada elemen UI interaktif (tombol notifikasi & pengaturan) serta standarisasi rasio kontras visual pada teks prefix mata uang (Rp) untuk keterbacaan tingkat lanjut.
- **Arsitektur Test & Folder**: Pembersihan repositori secara masif dengan memusatkan seluruh 278 test case `vitest` ke dalam direktori terdedikasi `src/__tests__/`.
- **Code Optimization**: Mencegah re-render yang boros di React dengan penambahan mitigasi secara ketat menggunakan `React.memo`, `useMemo`, dan `useCallback`.
- **UI/UX PWA**: Peningkatan ukuran _touch target_ minimal `44x44px` dan konsistensi warna _Neon Terminal_ agar mematuhi standar _Mobile Responsiveness_.

### 🛠️ Fixed

- **iOS Auto-Zoom Bug**: Menstandarisasi `font-size: 16px` pada `input` dan `select` form untuk melenyapkan perilaku auto-zoom peramban Safari iOS yang mengganggu.
- **Visual Overlap Input**: Memperbaiki tumpang tindih visual antara _prefix_ statis "Rp" dan input harga menggunakan custom class `.form-input-prefixed`.
- **Deployment ERESOLVE Error**: Mengeliminasi peringatan konflik _Peer Dependency_ React 19 / ESLint v10 ketika melakukan _deployment_ di server Vercel via `.npmrc` dengan `legacy-peer-deps`.
- Menghapus 100% _dead-code_ (impor dan variabel yang tidak pernah diakses).
