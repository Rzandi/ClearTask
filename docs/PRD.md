# 📝 Product Requirements Document (PRD) — ClearTask

> **Project:** ClearTask v3.1.0  
> **Status:** Pending Approval (URG-3a)  
> **Date:** 2026-05-30  
> **Language:** Bahasa Indonesia

---

## 1. Executive Summary

**ClearTask** adalah aplikasi kasir offline-first, pencatatan penjualan, dan analisis stok (Task/Replenishment Management) berbasis web. Dirancang untuk bekerja 100% secara lokal menggunakan browser storage (**IndexedDB via Dexie.js**) sebagai _Source of Truth_ (SoT) tunggal. Versi v3.1.0 difokuskan pada penguatan arsitektur modern (React 19, Tailwind CSS v4, Vite 8), integrasi Web Worker untuk analisis stok SAW, serta fitur cold-data archiving untuk memastikan kinerja aplikasi tetap prima seiring bertambahnya data.

---

## 2. Problem Statement

Aplikasi penjualan offline-first sering mengalami beberapa kendala krusial:

1. **Timezone Offset Bug:** Selisih zona waktu WIB (UTC+7) dengan UTC sering kali menyebabkan transaksi yang tercatat antara pukul 00:00 - 06:59 tercatat pada tanggal kemarin, mengacaukan pelaporan keuangan harian.
2. **UI Thread Blocking:** Algoritma evaluasi stok yang berat (seperti SAW) berjalan di render thread utama, menyebabkan UI membeku (frozen) saat melakukan perhitungan besar.
3. **Data Loss (Quota Exhausted):** Ketika ruang disk browser penuh, kegagalan penulisan IndexedDB ditelan secara diam-diam (_silent failure_), yang memicu kehilangan data (_data loss_) tanpa disadari user.
4. **Stale Metadata:** Nama kasir yang tercatat pada transaksi sering kali tidak sinkron dengan konfigurasi kasir aktif di Settings, merusak keabsahan data historis kasir.

---

## 3. Goals & Success Metrics

- **Goals:**
  - Menghilangkan bug timezone 100% pada semua fitur pencatatan, ekspor, dan sesi.
  - Memindahkan perhitungan berat SAW ke background thread.
  - Menghadirkan mekanisme _Graceful Failure handling_ pada kegagalan penulisan basis data.
  - Sinkronisasi instan nama kasir aktif ke data penjualan baru.
- **Success Metrics:**
  - **Kinerja UI:** 60 FPS tetap terjaga selama kalkulasi SAW dijalankan (0 frame drops).
  - **Keamanan Data:** 0% silent data loss dengan 100% throw & toast alert pada `QuotaExceededError`.
  - **Akurasi Laporan:** Tingkat akurasi pencatatan tanggal transaksi mencapai 100% di semua zona waktu lokal Indonesia.

---

## 4. User Personas

- **Persona 1: Budi (Kasir Toko)**
  - _Kebutuhan:_ Menginput penjualan harian dengan cepat dan mencatat nama kasir secara akurat tanpa harus log in berulang kali.
- **Persona 2: Fikz (Owner Toko / Admin)**
  - _Kebutuhan:_ Menganalisis produk yang paling mendesak untuk dibeli ulang (restock) berdasarkan volume penjualan, margin keuntungan, frekuensi transaksi, dan sisa stok menggunakan metode SAW, tanpa hambatan performa.

---

## 5. Feature Requirements

### 🔴 Must Have (Critical)

- **FR-01: Timezone-Standardized Dates**
  - Menggunakan helper `toLocalDateString()` untuk mengunci format YYYY-MM-DD sesuai kalender lokal di semua modul transaksi, pencarian, ekspor, dan sesi.
- **FR-02: Web Worker SAW Execution**
  - Perhitungan matriks prioritas restock SAW wajib dipindahkan ke Web Worker (`sawWorker.ts`) agar thread UI tetap responsif.
- **FR-03: Graceful Quota Exhaustion Alert**
  - Deteksi error `QuotaExceededError` di level write database, lalu abort transaksi secara atomic dan munculkan pesan kegagalan ke user.
- **FR-04: Dynamic Cashier Binding**
  - Form penjualan (`InputPenjualan`) wajib membaca state kasir aktif secara dinamis dari `SettingsContext` saat dimount.

### 🟡 Should Have (Important)

- **FR-05: Double-Merge Prevention**
  - Modul impor data wajib memverifikasi UUID `transactionId` yang masuk untuk mendeteksi dan melewati data duplikat secara dinamis.
- **FR-06: Atomic Cold-Data Archival**
  - Fitur pengarsipan otomatis untuk memindahkan data transaksi yang sangat tua ke tabel arsip (`archive_transactions`) demi meringankan beban query tabel utama.

### 🟢 Nice to Have (Future Scope)

- **FR-07: Configurable Low-Stock Threshold**
  - Ambang batas stok tipis (default `<= 5`) dapat diubah secara kustom melalui menu Settings.
- **FR-08: Supabase Cloud Sync (Optional)**
  - Sinkronisasi data ke cloud secara opsional bagi toko yang memerlukan backup server.

---

## 6. Out of Scope

- Integrasi pembayaran digital real-time (e-wallet/QRIS gateway).
- Manajemen multi-cabang/multi-outlet (sistem dirancang eksklusif untuk single-store offline).

---

## 7. Assumptions & Constraints

- **Assumptions:** Browser pengguna modern mendukung standard IndexedDB, Web Workers, dan React 19 concurrent APIs.
- **Constraints:** Aplikasi wajib berjalan 100% offline secara mandiri (fully standalone). Tidak ada backend server penunjang.

---

## 8. Timeline Overview

- **Fase 2 (Validation):** Pemetaan Characterization Tests & TDD RED (1 Hari - Selesai).
- **Fase 3 (Architecture & Docs):** Penyusunan PRD, SRS, SDD (1 Hari - Berjalan).
- **Fase 4 (Prompting & Tasking):** Sprint Backlog breakdown (0.5 Hari).
- **Fase 5 (Execution):** TTD Green implementation (2 Hari).
