# 📄 Software Requirements Specification (SRS) — ClearTask

> **Project:** ClearTask v3.2.0  
> **Status:** Released (APPROVED & RELEASED)  
> **Date:** 2026-05-30  
> **Language:** Bahasa Indonesia

---

## 1. Introduction

### 1.1 Purpose

Dokumen ini mendefinisikan spesifikasi kebutuhan perangkat lunak (SRS) untuk aplikasi **ClearTask v3.2.0**. Dokumen ini ditujukan sebagai panduan teknis bagi Architect, Designer, Coder, dan QA Agent selama implementasi fitur-fitur baru, refactoring sistem legacy, dan perluasan fitur bisnis premium.

### 1.2 Scope

ClearTask v3.2.0 adalah aplikasi berbasis web kasir offline-first dengan modul penunjang keputusan (DSS) SAW untuk prioritas restock barang, terintegrasi dengan pencatatan harga modal, operasional pengeluaran (expenses), visualisasi performa SVG offline, dan laporan penutupan sesi kasir terperinci. Seluruh data disimpan lokal menggunakan IndexedDB (Dexie.js).

### 1.3 Definitions

- **IndexedDB:** Database transaksional tingkat rendah yang didukung browser untuk penyimpanan data lokal terstruktur dalam jumlah besar.
- **Dexie.js:** Library wrapper IndexedDB yang ramah pengembang untuk mempermudah query basis data dan penanganan transaksi ACID.
- **SAW (Simple Additive Weighting):** Algoritma penjumlahan terbobot untuk analisis multi-kriteria guna menentukan peringkat alternatif prioritas.
- **Web Worker:** API HTML5 untuk menjalankan script JavaScript di background thread secara asinkron tanpa memblokir antarmuka pengguna (thread render utama).
- **SoT (Source of Truth):** Sumber data tunggal yang disepakati sebagai data paling valid dalam sistem.

---

## 2. Overall Description

### 2.1 Product Perspective

ClearTask v3.1.0 beroperasi 100% sebagai aplikasi web offline mandiri (_Fully Offline_). Arsitektur aplikasi sepenuhnya tersemat di sisi klien (embedded service layer), menyingkirkan backend server tradisional.

### 2.2 Product Functions

- Pencatatan transaksi penjualan dengan pengikatan historis harga modal.
- Pencatatan dan manajemen pengeluaran operasional toko (operational expenses).
- Visualisasi analitik performa harian (Pemasukan, Pengeluaran, Profit) via SVG Chart murni.
- Laporan penutupan sesi kasir (Closing Report) terperinci dengan rincian barang terjual terlaris.
- Manajemen reaktif penambahan/penghapusan kategori dan sub-kategori kustom secara dinamis.
- Perhitungan prioritas restock barang otomatis menggunakan algoritma SAW.
- Impor dan ekspor basis data lokal dengan aman melalui validasi skema JSON.
- Pengarsipan otomatis data transaksi lawas (_cold-data archiving_).
- Konfigurasi parameter kasir, nama toko, dan bobot kriteria SAW.

### 2.3 User Classes and Characteristics

- **Kasir (Operator):** Memerlukan antarmuka masukan transaksi penjualan yang cepat, responsif, dan bebas dari kendala tanggal.
- **Admin / Owner (Pengambil Keputusan):** Menggunakan fitur konfigurasi sistem, impor/ekspor database, dan analisis restock terbobot (SAW).

---

## 3. Functional Requirements

### 3.1 Core System & Storage

- **FR-01: Timezone-Safe Local Calendar**
  - _Deskripsi:_ Sistem harus mencatat dan membandingkan tanggal transaksi serta sesi berdasarkan waktu lokal zona wilayah pengguna, bukan UTC.
  - _Detail:_ Menggunakan helper `toLocalDateString()` untuk mengunci format YYYY-MM-DD di semua lookup query database.
- **FR-02: Multi-Version Database Migration**
  - _Deskripsi:_ Database Dexie.js harus mendukung skema peningkatan multi-versi (v1 sampai v6) untuk menjaga integritas data historis selama upgrade.
- **FR-03: Atomic Merge Import**
  - _Deskripsi:_ Modul import database JSON wajib menggunakan ACID transaction. Jika satu baris data gagal diimpor, seluruh proses impor harus dibatalkan (_rollback_).

### 3.2 Sales & Sessions

- **FR-04: Dynamic Active Cashier Association**
  - _Deskripsi:_ Form input penjualan harus otomatis memetakan kasir yang sedang aktif berdasarkan nilai terkonfigurasi di `SettingsContext` ketika transaksi ditambahkan.
- **FR-05: Double-Merge Prevention**
  - _Deskripsi:_ Saat mengimpor database, sistem wajib membandingkan `transactionId` di payload dengan data lokal untuk mencegah penulisan transaksi duplikat.

### 3.3 Replenishment SAW Decision Matrix

- **FR-06: Background Worker Execution**
  - _Deskripsi:_ Perhitungan normalisasi kriteria (frekuensi, volume, margin, sisa stok) dan penilaian SAW wajib dikirimkan dan dieksekusi di background thread menggunakan Web Worker (`sawWorker.ts`).
- **FR-07: SAW Snapshot Logging**
  - _Deskripsi:_ Setelah kalkulasi SAW selesai, sistem harus mampu merekam snapshot hasil analisis 10 alternatif teratas ke dalam tabel `saw_history`.

### 3.4 Data Archival

- **FR-08: Automatic Cold-Data Archival**
  - _Deskripsi:_ Sistem harus menyediakan utilitas pemindahan transaksi yang berumur melebihi parameter tanggal tertentu secara atomic ke tabel `archive_transactions`.

### 3.5 Business Extensions (v3.2.0)

- **FR-09: Historical Cost Price (Harga Modal) Mappings**
  - _Deskripsi:_ Sistem wajib mengunci harga modal produk pada saat checkout ke dalam detail item transaksi untuk menjaga keakuratan margin laba secara historis.
- **FR-10: Dedicated Operational Expenses Management**
  - _Deskripsi:_ Menyediakan modul pencatatan pengeluaran operasional (Bahan Baku, Gaji, Sewa, Operasional, Lainnya) dengan validasi nominal ketat ke IndexedDB `expenses`.
- **FR-11: Offline Area Performance SVG Chart**
  - _Deskripsi:_ Rapor performa keuangan (Pemasukan, Pengeluaran, Profit Bersih) dihitung otomatis dan divisualisasikan menggunakan diagram area SVG responsif tanpa library eksternal.
- **FR-12: Aggregated Sold Items Closing Report**
  - _Deskripsi:_ Laporan penutupan sesi menyertakan tabel detail barang yang terjual beserta jumlah kuantitas dan akumulasi total rupiahnya secara berurutan.
- **FR-13: Interactive Custom Categories Creation**
  - _Deskripsi:_ Kasir/Admin dapat secara dinamis menambah dan menghapus kategori serta sub-kategori kustom dari antarmuka menu Pengaturan.

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-PERF)

- **NFR-PERF-01: Responsive UI Thread**
  - Thread rendering utama harus bebas dari hambatan (_jank_), mempertahankan kinerja 60 FPS selama proses perhitungan SAW berlangsung.
- **NFR-PERF-02: Isolated DB Hook Querying**
  - Komponen pemantauan metrik penjualan harian harus menggunakan hooks terpisah (`useTransactionMetrics`) untuk menghindari penguraian basis data berulang di setiap siklus render filter.

### 4.2 Security (NFR-SEC)

- **NFR-SEC-01: Atomic Transaction Protection**
  - Seluruh operasi modifikasi database massal (import, merge, archive) wajib dilindungi di dalam `db.transaction()` block.
- **NFR-SEC-02: Production Backdoor Block**
  - Kode-kode pengujian khusus (_test backdoors_) seperti `injectKeyForTesting` dilarang keras terpapar ke dalam production build.

### 4.3 Reliability & Usability (NFR-REL)

- **NFR-REL-01: Storage Overflow Notification**
  - Jika browser menolak penulisan data akibat batasan penyimpanan, sistem wajib melempar `QuotaExceededError` dan memunculkan notifikasi Toast peringatan kegagalan simpan kepada kasir.
- **NFR-REL-02: Intuitive Tab Navigation**
  - Navigasi tab-based client harus terintegrasi dengan browser history (`popstate`) sehingga tombol _back_ / _forward_ browser dapat menggerakkan navigasi tab dengan benar.

---

## 5. External Interface Requirements

- **EIR-01: Local File System Access**
  - Sistem berinteraksi dengan filesystem lokal pengguna untuk memicu download data JSON hasil ekspor dan ekspor CSV.
- **EIR-02: Native PWA Installer**
  - Memanfaatkan event `beforeinstallprompt` untuk menyediakan tombol pasang aplikasi kustom pada antarmuka web.

---

## 6. System Constraints

- **SC-01:** Aplikasi harus 100% mandiri, tidak boleh melakukan request jaringan (network requests) untuk fungsionalitas inti.
- **SC-02:** Didukung secara eksklusif oleh kapabilitas native browser modern (tidak kompatibel dengan browser lawas tanpa dukungan IndexedDB dan HTML5 Web Workers).
