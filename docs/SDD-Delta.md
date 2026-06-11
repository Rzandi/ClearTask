# 🏗️ Software Design Document Delta (SDD-Delta) — ClearTask

> **Project:** ClearTask v3.1.0  
> **Status:** Pending Approval (URG-3c)  
> **Date:** 2026-05-30  
> **Language:** Bahasa Indonesia

---

## 1. System Architecture Overview

ClearTask v3.1.0 adalah aplikasi berbasis klien 100% (_Fully Offline_). Seluruh modul logika bisnis, validasi, penunjang keputusan (SAW), dan manajemen penyimpanan tertanam secara lokal di browser.

### Perubahan Arsitektur (Legacy ➔ Delta):

- **Sebelumnya (Legacy v2.5.0):** Data transaksi dan sesi disimpan dalam format string serialized di `localStorage`. Seluruh kalkulasi, pelaporan, dan query memicu operasi pembacaan & penulisan _write-then-re-read_ ke localStorage secara repetitif yang menyebabkan bottleneck render UI harian.
- **Sekarang (v3.1.0):** Penyimpanan bermigrasi penuh ke **IndexedDB** menggunakan **Dexie.js**. Integrasi reactive binding menggunakan `dexie-react-hooks` (`useLiveQuery`) secara langsung melacak mutasi data untuk memperbarui state UI secara efisien tanpa re-read manual. Proses perhitungan matriks prioritas SAW didelegasikan penuh ke background thread asinkron menggunakan HTML5 **Web Workers**.

```
  ┌────────────────────────────────────────────────────────┐
  │                 React Client UI Layer                  │
  │     (App.tsx, InputPenjualan, RestockAnalysis, etc.)   │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼  Reactive Binding (useLiveQuery)
  ┌────────────────────────────────────────────────────────┐
  │              Isolated Service & Hooks Layer            │
  │   (useTransactions, useSession, databaseManager.ts)    │
  └──────────────┬───────────────────────────┬─────────────┘
                 │                           │
                 │ Asynchronous Query        │ Offload (SAW)
                 ▼                           ▼
  ┌──────────────────────────┐   ┌─────────────────────────┐
  │         Dexie.js         │   │       Web Worker        │
  │       (IndexedDB)        │   │     (sawWorker.ts)      │
  │  "Source of Truth (SoT)" │   │                         │
  └──────────────────────────┘   └─────────────────────────┘
```

---

## 2. Database Schema (IndexedDB via Dexie)

IndexedDB diimplementasikan dalam format skema tabel non-relasional ter-index sebagai berikut:

### 2.1 Tabel `transactions` (Version 5 Schema)

Menyimpan dokumen detail transaksi penjualan.

- _Store Definition:_ `++id, transactionId, tanggal, sessionId, createdAt, kasir, updatedAt, syncStatus`

| Kolom           | Tipe Data                | Index        | Deskripsi                                         |
| --------------- | ------------------------ | ------------ | ------------------------------------------------- |
| `id`            | `number` (Autoincrement) | Ya (Primary) | ID internal auto-increment.                       |
| `transactionId` | `string` (UUID)          | Ya           | ID transaksi unik global.                         |
| `tanggal`       | `string` (YYYY-MM-DD)    | Ya           | Tanggal transaksi zona waktu lokal.               |
| `sessionId`     | `number` \| `null`       | Ya           | Foreign key relasi ke sesi aktif.                 |
| `createdAt`     | `string` (ISO String)    | Ya           | Timestamp waktu pembuatan.                        |
| `kasir`         | `string`                 | Ya           | Nama kasir yang mencatat transaksi.               |
| `items`         | `Array<CartItem>`        | Tidak        | Array produk belanja (lihat struktur `CartItem`). |
| `total`         | `number`                 | Tidak        | Grand Total nominal belanjaan.                    |
| `uangDiterima`  | `number`                 | Tidak        | Jumlah uang tunai yang dibayarkan.                |
| `kembalian`     | `number`                 | Tidak        | Kembalian uang belanja.                           |
| `updatedAt`     | `string` (ISO String)    | Ya           | Timestamp modifikasi terakhir.                    |
| `syncStatus`    | `'local'` \| `'synced'`  | Ya           | Status sinkronisasi offline.                      |

#### _Sub-struktur CartItem:_

```typescript
interface CartItem {
  namaBarang: string;
  qty: number;
  hargaSatuan: number;
  total: number;
  kategori: string;
  subKategori: string;
}
```

### 2.2 Tabel `sessions`

Mencatat riwayat shift kasir/sesi penjualan.

- _Store Definition:_ `&id, status, tanggalMulai, updatedAt, syncStatus`

| Kolom          | Tipe Data                        | Index        | Deskripsi                               |
| -------------- | -------------------------------- | ------------ | --------------------------------------- |
| `id`           | `number` (Timestamp / Custom ID) | Ya (Primary) | ID unik sesi (misal timestamp mulai).   |
| `status`       | `'open'` \| `'closed'`           | Ya           | Status aktif sesi kasir.                |
| `namaSesi`     | `string`                         | Tidak        | Label nama sesi (contoh: "Shift Pagi"). |
| `tanggalMulai` | `string` (YYYY-MM-DD)            | Ya           | Tanggal pembukaan sesi.                 |
| `waktuMulai`   | `string` (ISO String)            | Tidak        | Timestamp pembukaan sesi.               |
| `waktuSelesai` | `string` \| `null`               | Tidak        | Timestamp penutupan sesi.               |
| `updatedAt`    | `string` (ISO String)            | Ya           | Timestamp modifikasi terakhir.          |
| `syncStatus`   | `'local'` \| `'synced'`          | Ya           | Status sinkronisasi.                    |

### 2.3 Tabel `inventory`

Data barang dan tingkat stok aktif.

- _Store Definition:_ `&id, nama, kategori, createdAt, updatedAt, syncStatus`

| Kolom         | Tipe Data               | Index        | Deskripsi                        |
| ------------- | ----------------------- | ------------ | -------------------------------- |
| `id`          | `number` \| `string`    | Ya (Primary) | Kode barang / SKU.               |
| `nama`        | `string`                | Ya           | Nama barang/produk.              |
| `kategori`    | `string`                | Ya           | Kategori barang.                 |
| `subKategori` | `string`                | Tidak        | Sub-kategori produk.             |
| `stok`        | `number`                | Tidak        | Jumlah persediaan aktif.         |
| `hargaBeli`   | `number`                | Tidak        | Harga perolehan/pokok pembelian. |
| `hargaJual`   | `number`                | Tidak        | Harga jual ke konsumen.          |
| `createdAt`   | `string` (ISO String)   | Ya           | Waktu produk ditambahkan.        |
| `updatedAt`   | `string` (ISO String)   | Ya           | Timestamp modifikasi terakhir.   |
| `syncStatus`  | `'local'` \| `'synced'` | Ya           | Status sinkronisasi.             |

### 2.4 Tabel `saw_criterias`

Konfigurasi bobot kriteria SAW.

- _Store Definition:_ `++id`

| Kolom       | Tipe Data                | Index        | Deskripsi                                      |
| ----------- | ------------------------ | ------------ | ---------------------------------------------- |
| `id`        | `number` (Autoincrement) | Ya (Primary) | ID baris criteria tunggal.                     |
| `c1_weight` | `number` (Float)         | Tidak        | Bobot C1: Volume Penjualan (default: 0.35).    |
| `c2_weight` | `number` (Float)         | Tidak        | Bobot C2: Sisa Stok (default: 0.30).           |
| `c3_weight` | `number` (Float)         | Tidak        | Bobot C3: Margin Profit (default: 0.20).       |
| `c4_weight` | `number` (Float)         | Tidak        | Bobot C4: Frekuensi Transaksi (default: 0.15). |
| `updatedAt` | `string`                 | Tidak        | Timestamp waktu perubahan bobot.               |

### 2.5 Tabel `saw_history`

Rekaman snapshot hasil perhitungan SAW.

- _Store Definition:_ `++id, period, createdAt`

| Kolom              | Tipe Data                | Index        | Deskripsi                                         |
| ------------------ | ------------------------ | ------------ | ------------------------------------------------- |
| `id`               | `number` (Autoincrement) | Ya (Primary) | ID baris snapshot.                                |
| `period`           | `string`                 | Ya           | Periode filter perhitungan (cth: `last_30_days`). |
| `createdAt`        | `string` (ISO String)    | Ya           | Waktu pencatatan snapshot harian.                 |
| `weights`          | `SAWCriterias`           | Tidak        | Struktur bobot kriteria yang digunakan.           |
| `results_snapshot` | `Array<SAWResultItem>`   | Tidak        | Snapshot peringkat top 10 produk.                 |
| `urgent_count`     | `number`                 | Tidak        | Jumlah barang berskoring 'urgent'.                |

### 2.6 Tabel `archive_transactions`

Menyimpan transaksi lawas yang sudah diarsipkan.

- _Store Definition:_ `++id, transactionId, tanggal, sessionId, createdAt, kasir, updatedAt, syncStatus`

---

## 3. Module & Hooks Diagram

Komposisi pemisahan fungsionalitas dan decoupling modul terintegrasi sebagai berikut:

```
  ┌────────────────────────────────────────────────────────┐
  │                    useTransactions()                   │
  │       (Specialized Hook Composition Coordinator)       │
  └────────┬───────────────────┬───────────────────┬───────┘
           │                   │                   │
           ▼                   ▼                   ▼
  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │useTransactionData│ │useTransactionFilter│useTransactionMetrics│
  │ - CRUD Ops      │ │ - Date Range    │ │ - Performance   │
  │ - Dexie Add/Del │ │ - Sort Order    │ │   Isolated      │
  │ - Loading State │ │ - Search Query  │ │   Aggregator    │
  └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 4. Local API & Worker Contracts (Fully Offline API)

Karena aplikasi berjalan sepenuhnya offline, komunikasi data antar layer (UI ke Service Layer) dan layer asinkron (UI ke Worker) dikunci oleh kontrak data terstruktur.

### 4.1 SAW Web Worker Communication Contract (`sawWorker.ts`)

#### _Input Payload (PostMessage):_

```typescript
interface SAWWorkerInput {
  txsToProcess: Transaction[];
  inv: InventoryItem[];
  weights: {
    c1_weight: number; // Volume
    c2_weight: number; // Sisa Stok
    c3_weight: number; // Margin Profit
    c4_weight: number; // Frekuensi
  };
}
```

#### _Output Response Payload (OnMessage):_

```typescript
interface SAWWorkerOutput {
  results: SAWResultItem[];
  excluded: ExcludedItem[];
  error?: string;
}
```

### 4.2 Database Merge calculation Service Contract (`databaseManager.ts`)

```typescript
export function calculateMerge(importData: DatabaseExport): Promise<MergeResult>;
export function applyMerge(
  data: DatabaseExport | MergeResult
): Promise<{ success: boolean; error: string | null }>;
```

---

## 5. State Management Flow (Tab-Based Client Router)

- **Hash-Routing Configuration:** Status navigasi disimpan dalam state string `activeTab` (`App.tsx`), disinkronkan langsung ke URL hash browser (`#input`, `#database`, `#riwayat-sesi`, `#spk`).
- **History Synchronizer:** Listener `popstate` di App.tsx memantau navigasi tombol browser _Back_ dan _Forward_ untuk memperbarui state router `activeTab` secara dua arah secara instan.

---

## 6. Security Design & Data Integrity

1. **Atomic Transaction Scope:** Semua modifikasi basis data massal di dalam `applyMerge` dan `archiveOldTransactions` dibungkus di dalam transaksi Dexie `rw` (Read-Write). Kegagalan pada salah satu modifikasi tabel memicu pembatalan otomatis (_abort & rollback_) IndexedDB secara penuh.
2. **Quota Error Propagation:** Operasi penulisan database (CRUD) tidak menangkap kesalahan penyimpanan secara diam-diam. Error gelembung (`QuotaExceededError`) akan dilempar ke custom hooks penanggung jawab, lalu memicu Toast alert merah ke kasir untuk mencegah hilangnya data secara sunyi (_silent data loss_).
3. **Backdoor Execution Shielding:** Bundler Vite diatur agar tidak mengekspos pointer diagnostik runtime ke ranah global window objek di lingkungan `production`.
