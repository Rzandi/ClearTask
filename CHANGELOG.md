# Changelog

Semua perubahan penting pada proyek ClearTask akan didokumentasikan dalam file ini.
Format yang digunakan berdasarkan pedoman [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.4.0] - 2026-06-11

Versi 3.4.0 berfokus pada integrasi manajemen stok inventaris otomatis (Sales-Driven Stock Control), deteksi produk baru secara cerdas (POS-Linked Auto-Detection), pencarian cepat inventaris langsung dari layar penjualan (Right-Side Cek Stok Panel), pelaporan keuntungan bersih harian/bulanan/tahunan terperinci, dan modul cetak struk Bluetooth Thermal Printer (Web Bluetooth GATT API).

### 🎉 Added & Enhanced (POS, Inventory & Printing Upgrades)

- **Web Bluetooth Thermal Print Support**: Menambahkan utilitas `bluetoothPrinterHelper.ts` untuk berkomunikasi langsung dengan printer kasir termal 58mm via Web Bluetooth GATT API. Menyusun byte ESC/POS dengan format 32-kolom, cetak bold nama barang, perataan tengah otomatis, dan pengiriman data secara bertahap (chunked 20-byte write) untuk menghindari buffer overflow.
- **StrukModal Bluetooth Print Button**: Mengintegrasikan tombol print Bluetooth dan status panel responsif yang menampilkan status pairing, koneksi, pengiriman data, dan pesan diagnostik kegagalan di footer receipt modal.
- **Auto-Deduction of Inventory Stock**: Penjualan barang secara otomatis mengurangi kuantitas stok barang di tabel `inventory` secara atomik di dalam transaksi database Dexie, lengkap dengan pembatasan nilai minimum agar tidak negatif.
- **Auto-Detection & Registration of New Products**: Ketika nama produk baru yang belum terdaftar dimasukkan di tab POS Input Manual, sistem secara otomatis mendeteksi status "Barang Baru" dan mendaftarkannya ke database inventaris dengan default Stok = 0, Harga Modal = 0, kategori POS, dan harga jual yang disinkronkan dari harga input penjualan.
- **Right-Pane Cek Stok & Autocomplete**: Menambahkan tab panel "Cek Stok" di sebelah kanan POS untuk pencarian dan peninjauan stok & harga modal secara instan. Menambahkan autocomplete suggest dropdown pada input nama barang tab manual POS untuk mempermudah penjualan barang terdaftar.
- **Keuntungan (Profit) & Harga Modal Columns**: Memperluas tabel laporan transaksi (`TransactionTable.tsx`) dengan kolom Harga Modal (total modal per faktur) dan Keuntungan Bersih (Total Jual - Total Modal), diwarnai biru (profit) atau merah (rugi) secara dinamis.
- **Filter Tahunan (Yearly Filter)**: Menambahkan tombol pintas filter "Tahunan" pada halaman Laporan dan memperluas visualisasi SVG `ReportingChart.tsx` agar secara dinamis melakukan agregasi performa berdasarkan Bulan (Jan, Feb, Mar, dll.) ketika filter tahunan aktif.

### 🛠️ Fixed & Hardened

- **React Hook Initialization Order Error**: Memperbaiki `ReferenceError: Cannot access 'form' before initialization` di `InputPenjualan.tsx` akibat peletakan state form setelah hook useMemo/useCallback yang mereferensikannya.
- **Comprehensive Test Coverage**: Menambahkan 4 file pengujian Vitest baru (`useTransactionData.test.jsx`, `ReportingChart.test.jsx`, `TransactionTable-profit.test.jsx`, dan `StrukModal.test.jsx`) untuk memverifikasi fungsionalitas baru dengan 14 unit test baru yang menguji kondisi batas, penanganan input kosong, dan stubbing print global. Total pengujian naik menjadi 291 passed.

---

## [3.3.0] - 2026-06-06

Versi 3.3.0 berfokus pada keandalan migrasi data tingkat lanjut (Advanced Data Portability), peningkatan skema cadangan (Database Backup v2.0), penanganan pemulihan kategori secara otomatis (Self-Healing Category Sync), serta visualisasi pratinjau penggabungan data yang lebih detail dan transparan.

### 🎉 Added & Enhanced (Data Integrity & Portability)

- **Database Backup Schema v2.0**: Ekspor basis data kini ditingkatkan ke skema v2.0 untuk mencakup semua data operasional tambahan, yaitu pengeluaran (`expenses`), arsip transaksi (`archive_transactions`), kriteria penilaian SAW (`saw_criterias`), dan riwayat penilaian SAW (`saw_history`).
- **Backward-Compatible Import**: Menjamin kecocokan penuh ke belakang. Sistem secara otomatis mendeteksi cadangan v1.0 dan mengimpor tabel-tabel utama (transaksi, barang, dll.) dengan lancar tanpa crash.
- **Self-Healing Category Sync**: Implementasi fungsi `syncMissingCategories()` pada fase inisialisasi aplikasi (`App.tsx`). Jika kategori/sub-kategori preset bawaan hilang atau terhapus secara tidak sengaja, sistem akan memulihkannya kembali ke IndexedDB secara otomatis tanpa menimpa kategori kustom yang sudah dibuat pengguna.
- **Detailed Merge Preview Counts**: Memperluas antarmuka `MergePreviewModal` untuk menampilkan jumlah baris baru dan konflik secara mendalam pada setiap tabel yang terdampak sebelum pengguna melakukan penggabungan data (merge).

### 🛠️ Fixed & Hardened

- **Dexie Transaction Argument Limits**: Memperbaiki bug kompilasi TypeScript pada `db.transaction('rw', ...)` saat memproses lebih dari 6 tabel dengan membungkus parameter tabel ke dalam satu array array-based transaction.
- **TypeScript Strict Safety**: Melenyapkan peringatan implicit `any` pada parameter dictionary sub-kategori di closures mapping `databaseManager.ts`.
- **Integration Test Suite expansion**: Menambahkan 5 pengujian otomatis baru di `databaseManager.test.js` untuk memverifikasi merge logika v2.0, deteksi konflik LWW (Last-Write-Wins), dan backward compatibility impor v1.0. Semua 32 test suite (277 tests) kini berjalan 100% lulus.

---

## [3.2.0] - 2026-05-30

Versi 3.2.0 berfokus pada perluasan fitur bisnis premium (Business Extensions) dan integrasi data finansial yang mendalam (Deep Financial Integration) secara luring penuh (fully offline-first) untuk membantu pemilik toko mengelola keuntungan bersih secara real-time dan menganalisis operasional kasir dengan tingkat presisi yang lebih tinggi.

### 🎉 Added & Enhanced (Business Extensions)

- **Harga Modal (Cost Price) & Pengikatan Historis**: Menambahkan kolom harga modal pada inventaris barang di Master Barang. Sistem secara otomatis mengikat (_hard-bind_) harga modal produk pada saat checkout ke dalam detail item transaksi. Dengan demikian, perhitungan margin laba kotor historis tetap 100% akurat meskipun di kemudian hari harga modal barang di inventaris berubah.
- **Modul Pengeluaran Operasional (Input Keluaran)**: Menyediakan tab navigasi khusus (`InputKeluaran.tsx`) untuk mencatat pengeluaran operasional toko (seperti Bahan Baku, Gaji, Sewa, Operasional, Lainnya) secara luring ke IndexedDB `expenses`. Dilengkapi penyaringan tanggal, pencarian kata kunci, dan daftar riwayat khusus mobile.
- **Metrik Laba Bersih & Grafik Performa Visual (Pure SVG Chart)**: Menyusun panel metrik Laporan ringkas yang melacak Total Pemasukan, Total Pengeluaran, dan Laba Bersih (Pemasukan - Harga Modal Barang Terjual - Total Pengeluaran). Metrik ini dihubungkan langsung ke **Grafik Ikhtisar Performa Bisnis** berbasis diagram area SVG murni (`ReportingChart.tsx`) yang sangat ringan dan responsif tanpa library charting pihak ketiga.
- **Rincian Barang Terjual Terlaris di Closing Report**: Memperluas modal laporan penutupan shift kasir (`ClosingReportModal.tsx`) dengan menyertakan tabel detail barang terjual yang merangkum nama produk, kuantitas unit terjual (terurut menurun), dan total nominal penjualannya. Tampilan dioptimalkan secara defensif dengan scroll-lock dan pembatasan lebar kolom agar ramah di layar mobile.
- **Form Pembuatan Kategori & Sub-Kategori Dinamis**: Mengintegrasikan formulir pembuatan kategori dan sub-kategori kustom secara interaktif langsung dari dalam modal Pengaturan (`SettingsModal.tsx`), yang seketika disinkronisasikan ke dropdown masukan transaksi dan master barang secara real-time.

### 🛡️ Type-Safety, Compilations & Hardening

- **TypeScript Strict Compliance**: Menyelesaikan kendala kompilasi bertipe ketat (`exactOptionalPropertyTypes`) pada interface `CatalogItemProps` dengan mengizinkan properti `hargaModal` bernilai `number | undefined` secara aman.
- **Defensive Hook Destructuring**: Menambahkan parameter fallback bawaan pada destrukturisasi hook `useCategories` di SettingsModal untuk menjamin kekokohan layar pengaturan dari potensi crash akibat mock data minimal saat unit testing.
- **Test DOM Query Collision Resolution**: Menyelesaikan konflik kueri DOM pada pengujian otomatis akibat kesamaan teks kategori kustom di dropdown select dan list span dengan menyisipkan karakter zero-width space `\u200B` yang invisible secara visual namun unik secara string.

---

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
